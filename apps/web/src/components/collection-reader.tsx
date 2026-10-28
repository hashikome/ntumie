import type {
  Collection,
  CollectionOutline,
  CommentThreads,
  Resource,
  SessionView,
} from "@ntumie/types";
import { Suspense } from "react";
import { collectionPath, permalink, queryValue, withCursor } from "../lib/http";
import { serverRead } from "../lib/server-api";
import { readSession } from "../lib/session";
import { sourcePath } from "../lib/sharing";
import { Avatar } from "./avatar";
import { CollectionFeedback } from "./collection-feedback";
import { KeepBuilding, LivePanel } from "./collection-start";
import { Comments, type DiscussionSection } from "./comments";
import { FakeDoor } from "./fake-door";
import { FormNotice } from "./form-notice";
import { HubSearchShortcut } from "./hub-search-shortcut";
import { Updated } from "./local-time";
import { PaginatedList } from "./paginated-list";
import { Tags } from "./primitives";
import { ReaderMenu } from "./reader-menu";
import { ReaderTree } from "./reader-tree";
import { SectionSpy } from "./section-spy";
import { ShareAction } from "./share-action";

export type CollectionReads = ReturnType<typeof startCollectionReads>;

// These reads need only the route ID and share token, so callers start them
// before the collection metadata resolves. Each stays authorized by the API;
// results are discarded unless the collection itself loaded.
export function startCollectionReads(
  id: string,
  query: Record<string, string | string[] | undefined>,
) {
  const path = collectionPath(id);
  const token = queryValue(query.s, 512);
  const itemId = queryValue(query.item);
  const replyTo = queryValue(query.rt),
    replyCursor = queryValue(query.rc);
  const replyQuery =
    replyTo && replyCursor ? `&${new URLSearchParams({ replyTo, replyCursor })}` : "";
  return {
    resources: serverRead<Resource[]>(
      withCursor(`${path}/resources`, queryValue(query.cursor)),
      token,
    ),
    item: itemId
      ? serverRead<Resource>(`${path}/resources/${encodeURIComponent(itemId)}`, token)
      : Promise.resolve(null),
    discussion: serverRead<CommentThreads>(
      `${withCursor(`${path}/comments`, queryValue(query.cc))}${replyQuery}${
        queryValue(query.answered) === "1" ? "&answered=true" : ""
      }`,
      token,
    ),
    // The hub tree, sections and next collection (one read; replaces the hub read).
    outline: serverRead<CollectionOutline>(`${path}/outline`, token),
  };
}

export async function CollectionReader({
  collection,
  query,
  reads,
  resetPath,
}: {
  collection: Collection;
  query: Record<string, string | string[] | undefined>;
  reads: CollectionReads;
  resetPath?: string;
}) {
  const { id } = collection;
  const path = collectionPath(id);
  const token = queryValue(query.s, 512);
  const commentCursor = queryValue(query.cc);
  const replyTo = queryValue(query.rt),
    replyCursor = queryValue(query.rc);
  const answeredOnly = queryValue(query.answered) === "1";
  // Discussion was started alongside resources; never gate links on it.
  const { discussion } = reads;
  const session = readSession();
  // A discussion ready within a moment renders in place, so readers without
  // JavaScript get it in the first response; only a slow one streams behind
  // its loading state (streamed content needs JavaScript to appear).
  const [resources, outlineResult, item, ready] = await Promise.all([
    reads.resources,
    reads.outline,
    reads.item,
    Promise.race([
      Promise.all([discussion, session]),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 400)),
    ]),
  ]);
  if (!resources.ok)
    return <CollectionFeedback error={resources} returnTo={resetPath ?? permalink(id, token)} />;
  const outline: CollectionOutline = outlineResult.ok
    ? outlineResult.data
    : {
        hub: null,
        collections: [{ id, title: collection.title, current: true, sections: [] }],
        next: null,
      };
  const sections = outline.collections.find((entry) => entry.current)?.sections ?? [];
  const notice = queryValue(query.notice);
  const discussionNotice = notice?.startsWith("comment") || notice === "comments-off";
  const returnTo = resetPath ?? permalink(id, token);
  const itemContext = new URL(sourcePath(returnTo, query), "http://local.invalid");
  itemContext.searchParams.delete("item");
  const itemBase = itemContext.pathname + itemContext.search;
  const attached = attachedItem(
    queryValue(query.attach),
    resources.data,
    item?.ok ? item.data : undefined,
  );
  const contributors = collection.contributors;
  const owner = Boolean(collection.capabilities?.canEdit);
  const counts = [
    Boolean(collection.sectionCount) && plural(collection.sectionCount ?? 0, "section"),
    collection.resourceCount !== undefined && plural(collection.resourceCount, "resource"),
    // Whoever can change it sees whether it is published.
    owner && (collection.published ? "Published" : "Private"),
  ].filter(Boolean);
  // A new collection's owner prompts, until three links or a first section.
  const starting =
    owner && !token && (collection.resourceCount ?? 0) < 3 && collection.sectionCount === 0;
  return (
    <div className="reader-page" data-reader>
      <SectionSpy />
      <HubSearchShortcut />
      <ReaderMenu outline={outline} token={token} />
      <aside className="reader-sidebar" aria-label="In this hub">
        <FakeDoor
          feature="search"
          returnTo={sourcePath(returnTo, query)}
          className="hub-search-button"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="6" />
            <path d="m20 20-4-4" />
          </svg>
          Search this hub
          <kbd>Ctrl K</kbd>
        </FakeDoor>
        <nav aria-label="Collections in this hub">
          <ReaderTree outline={outline} token={token} />
        </nav>
      </aside>
      <div className="reader-main">
        {!discussionNotice && <FormNotice code={notice} />}
        <section className="reader-band" aria-labelledby="collection-title">
          <div className="reader-band-text">
            {outline.hub && (
              <a className="reader-crumb" href={`/h/${encodeURIComponent(outline.hub.id)}`}>
                {outline.hub.name}
              </a>
            )}
            <h1 id="collection-title">{collection.title}</h1>
            {collection.description ? (
              <p className="reader-description">{collection.description}</p>
            ) : (
              collection.capabilities?.canEdit && (
                <a className="add-description" href={`/c/${id}/edit`}>
                  + Add a description
                </a>
              )
            )}
            <Tags tags={collection.tags} limit={5} expandable />
            {contributors && contributors.total > 0 && (
              <p className="reader-people">
                <span className="avatar-stack" aria-hidden="true">
                  {contributors.people.slice(0, 3).map((person) => (
                    <Avatar key={person.userId} userId={person.userId} />
                  ))}
                </span>
                {contributors.total === 1 && contributors.people[0] ? (
                  <a href={`/${encodeURIComponent(contributors.people[0].username)}`}>
                    {contributors.people[0].username}
                  </a>
                ) : (
                  <span>{plural(contributors.total, "contributor")}</span>
                )}
              </p>
            )}
            <p className="reader-stats">
              Updated <Updated at={collection.updatedAt} />
              {counts.length > 0 && ` · ${counts.join(" · ")}`}
            </p>
            {collection.restriction && (
              <p className="form-notice">
                Distribution is on hold ({collection.restriction.reason.replaceAll("_", " ")}). You
                can correct your content.{" "}
                <a href={collection.restriction.supportUrl}>Contact support</a> for review.
              </p>
            )}
          </div>
          <div className="collection-actions reader-actions">
            <ShareAction
              target={{
                kind: "collection",
                id,
                ...(!collection.published && token ? { token } : {}),
              }}
              returnTo={sourcePath(returnTo, query)}
              className="button band-ghost"
              icon
            />
            {collection.capabilities?.canEdit && (
              <a className="button band-ghost" href={`/c/${id}/edit`}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />
                </svg>
                Edit
              </a>
            )}
          </div>
        </section>
        {sections.length > 0 && (
          <nav className="section-chips" aria-label="In this guide">
            {sections.map((section) => (
              <a key={section.id} href={`#section-${section.id}`} data-section-link={section.id}>
                {section.title}
              </a>
            ))}
          </nav>
        )}
        <div className="reader-columns">
          <article className="reader-content" aria-labelledby="collection-title">
            {starting && <LivePanel id={id} published={collection.published} />}
            {item && !item.ok && (
              <p className="form-notice" role="status">
                {[400, 404].includes(item.status)
                  ? "Item unavailable. It may have been removed or isn't in this collection."
                  : "Couldn't load this item. Try reloading the collection."}
              </p>
            )}
            <PaginatedList
              kind="resources"
              path={`${path}/resources`}
              initial={resources.data}
              nextCursor={resources.meta?.nextCursor}
              token={token}
              itemBase={itemBase}
              section={resources.meta?.section}
              selectedItem={item?.ok ? item.data : undefined}
              discussBase={returnTo}
              noteCollection={owner && !token ? id : undefined}
            />
            {starting && <KeepBuilding id={id} returnTo={sourcePath(returnTo, query)} />}
            {outline.next && outline.hub && (
              <a className="next-guide" href={permalink(outline.next.id)}>
                <span>
                  <small>Next in {outline.hub.name}</small>
                  <b>{outline.next.title}</b>
                </span>
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>
            )}
            <p className="made-with">
              Made with ntumie. <a href="/start">Start your own collection</a>
            </p>
          </article>
          {ready ? (
            <DiscussionView
              comments={ready[0]}
              signedIn={Boolean(ready[1])}
              collectionId={id}
              returnTo={returnTo}
              notice={discussionNotice ? notice : undefined}
              commentCursor={commentCursor}
              composerOpen={queryValue(query.compose) === "comment"}
              sections={sections}
              attached={attached}
              answeredOnly={answeredOnly}
              owner={owner}
            />
          ) : (
            <Suspense
              key={`${id}:${token ?? ""}:${commentCursor ?? ""}:${replyTo ?? ""}:${replyCursor ?? ""}:${answeredOnly}`}
              fallback={
                <section
                  className="comments"
                  id="comments"
                  aria-label="Discussion"
                  aria-busy="true"
                >
                  <header className="comments-heading">
                    <h2>Discussion</h2>
                  </header>
                  <p className="comments-state" role="status">
                    Loading discussion…
                  </p>
                </section>
              }
            >
              <CollectionDiscussion
                collectionId={id}
                discussion={discussion}
                session={session}
                returnTo={returnTo}
                notice={discussionNotice ? notice : undefined}
                commentCursor={commentCursor}
                composerOpen={queryValue(query.compose) === "comment"}
                sections={sections}
                attached={attached}
                answeredOnly={answeredOnly}
                owner={owner}
              />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}

const plural = (count: number, one: string) => `${count} ${count === 1 ? one : `${one}s`}`;

// The item a reader chose to Discuss, with the section it sits in (when it is
// on the page that is loaded).
function attachedItem(id: string | undefined, items: Resource[], selected?: Resource) {
  if (!id) return undefined;
  let section: string | undefined;
  for (const entry of items) {
    if (entry.kind === "heading") section = entry.id;
    else if (entry.id === id)
      return { id, title: entry.title ?? entry.url ?? "This link", sectionId: section };
  }
  if (selected?.id === id) return { id, title: selected.title ?? selected.url ?? "This link" };
  return undefined;
}

type DiscussionProps = {
  collectionId: string;
  returnTo: string;
  notice?: string;
  commentCursor?: string;
  composerOpen: boolean;
  sections: DiscussionSection[];
  attached?: { id: string; title: string; sectionId?: string };
  answeredOnly: boolean;
  owner: boolean;
};

async function CollectionDiscussion({
  discussion,
  session,
  ...props
}: DiscussionProps & {
  discussion: ReturnType<typeof serverRead<CommentThreads>>;
  session: Promise<SessionView | null>;
}) {
  const [comments, signedIn] = await Promise.all([discussion, session]);
  return <DiscussionView comments={comments} signedIn={Boolean(signedIn)} {...props} />;
}

function DiscussionView({
  comments,
  signedIn,
  collectionId,
  returnTo,
  notice,
  commentCursor,
  composerOpen,
  sections,
  attached,
  answeredOnly,
  owner,
}: DiscussionProps & {
  comments: Awaited<ReturnType<typeof serverRead<CommentThreads>>>;
  signedIn: boolean;
}) {
  const older = comments.ok ? comments.meta?.nextCursor : null;
  const olderHref = older
    ? `${returnTo}${returnTo.includes("?") ? "&" : "?"}${new URLSearchParams({
        cc: older,
        ...(answeredOnly ? { answered: "1" } : {}),
      })}#comments`
    : undefined;
  return (
    <Comments
      collectionId={collectionId}
      threads={comments.ok ? comments.data : null}
      returnTo={returnTo}
      signedIn={signedIn}
      notice={notice}
      olderHref={olderHref}
      commentCursor={commentCursor}
      composerOpen={composerOpen}
      sections={sections}
      attached={attached}
      answeredOnly={answeredOnly}
      owner={owner}
    />
  );
}
