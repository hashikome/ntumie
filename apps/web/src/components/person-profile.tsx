import { webServerConfig } from "@ntumie/config/web-server";
import type { Collection, PersonProfile as PersonProfileData } from "@ntumie/types";
import { notFound } from "next/navigation";
import { type ApiPath, permalink, withCursor } from "../lib/http";
import { readShared } from "../lib/server-api";
import { readOwnProfile, readSession } from "../lib/session";
import { Avatar } from "./avatar";
import { Feedback } from "./feedback";
import { FormNotice } from "./form-notice";
import { HubMark } from "./hub-mark";
import { Updated } from "./local-time";
import { ShareAction } from "./share-action";
import { ShareOpen } from "./share-open";
import { StartCollectionPrompt } from "./start-collection-prompt";

export async function PersonProfile({
  username,
  userId,
  cursor,
  notice,
  shareId,
}: {
  username?: string;
  userId?: string;
  cursor?: string;
  notice?: string;
  shareId?: string;
}) {
  const profilePath = userId ? `/people/${userId}` : `/${encodeURIComponent(username ?? "")}`;
  const apiPath: ApiPath = userId
    ? `/api/v1/people/${userId}`
    : `/api/v1/people/by-username/${encodeURIComponent(username ?? "")}`;
  const returnTo = `${profilePath}${cursor ? `?${new URLSearchParams({ cursor })}` : ""}`;
  const [result, session] = await Promise.all([
    readShared<PersonProfileData>(withCursor(apiPath, cursor)),
    readSession(),
  ]);
  if (!result.ok && result.status === 404) notFound();
  if (!result.ok) return <Feedback error={result} resetPath={profilePath} />;
  const { person, hub, collections, contributionCount } = result.data;
  const own = session?.userId === person.userId;
  // Only the owner sees the prompts, and only while they keep no collections.
  const mine = own ? await readOwnProfile() : null;
  const starting = Boolean(mine && (!mine.hubId || mine.hubCollectionCount === 0));
  return (
    <div className="band-page person-page" data-reader>
      <ShareOpen shareId={shareId} kind="profile" resourceId={person.userId} />
      <section className="brand-band page-band" aria-labelledby="person-title">
        <div className="band-identity">
          <span className="person-picture">
            <Avatar userId={person.userId} large />
          </span>
          <div>
            <h1 id="person-title">{person.name || person.username}</h1>
            {(person.name || hub) && (
              <p className="band-handle">
                <span>{person.username}</span>
                {hub && (
                  <>
                    {" "}
                    of <a href={`/h/${hub.id}`}>{hub.name}</a>
                  </>
                )}
              </p>
            )}
          </div>
        </div>
        {person.bio && <p className="band-lead person-bio">{person.bio}</p>}
        <div className="band-actions">
          {own && (
            <a className="button band-ghost" href="/settings">
              Settings
            </a>
          )}
          <ShareAction
            target={{ kind: "profile", id: person.userId }}
            returnTo={returnTo}
            className="button band-ghost"
          />
        </div>
      </section>
      <div className="band-body">
        {own && <FormNotice code={notice} />}
        {starting && mine ? (
          <div className="profile-prompts">
            <StartCollectionPrompt
              hubAddress={
                mine.hubId && mine.handle
                  ? `${new URL(webServerConfig().publicOrigin).host}/@${mine.handle}`
                  : undefined
              }
            />
            {!person.bio && (
              <section className="profile-hint" aria-labelledby="bio-hint-title">
                <h2 id="bio-hint-title">Say who you are</h2>
                <p>A line or two on what you read and why. It shows under your name.</p>
                <a className="button" href="/settings#bio">
                  Add a bio
                </a>
              </section>
            )}
          </div>
        ) : null}
        {(!starting || collections.length > 0) && (
          <section aria-labelledby="contributions-title">
            <div className="band-section-head">
              <h2 id="contributions-title">Contributions</h2>
              <span className="meta">{contributionCount}</span>
            </div>
            {collections.length ? (
              <ul className="collection-rows">
                {collections.map((item) => (
                  <ContributionRow key={item.id} item={item} />
                ))}
              </ul>
            ) : (
              <p className="meta">No public contributions yet.</p>
            )}
            {result.meta?.nextCursor && (
              <div className="continuation">
                <a
                  className="button"
                  href={`${profilePath}?cursor=${encodeURIComponent(result.meta.nextCursor)}`}
                >
                  Show more
                </a>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

const plural = (count: number, one: string) => `${count} ${count === 1 ? one : `${one}s`}`;

// A collection the person helped make, with its hub and what they did there.
function ContributionRow({ item }: { item: Collection }) {
  const done = item.contribution;
  return (
    <li className="owned-row collection-item">
      <div>
        <a className="owned-row-title" href={permalink(item.id)}>
          {item.title}
        </a>
        {item.description && <span className="owned-row-description">{item.description}</span>}
        <span className="owned-row-meta">
          {item.hub && (
            <a className="row-hub" href={`/h/${encodeURIComponent(item.hub.id)}`}>
              <HubMark hubId={item.hub.id} size={20} />
              {item.hub.name}
            </a>
          )}
          {done?.kind === "created" || !done ? (
            <span>
              {item.hub && "· "}
              {done ? "Created · " : ""}Updated <Updated at={item.updatedAt} />
            </span>
          ) : (
            <span>
              {item.hub && "· "}
              {done.kind === "links"
                ? `Added ${plural(done.count, "link")}`
                : done.kind === "sections"
                  ? `Added ${plural(done.count, "section")}`
                  : "Edited"}{" "}
              · <Updated at={done.at} />
            </span>
          )}
        </span>
      </div>
    </li>
  );
}
