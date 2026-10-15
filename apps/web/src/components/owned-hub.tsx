import { webServerConfig } from "@ntumie/config/web-server";
import type { Collection, Profile, SavedCollection, SharedCollection } from "@ntumie/types";
import { permalink, withCursor } from "../lib/http";
import { operatorRead } from "../lib/operator-read";
import { serverRead } from "../lib/server-api";
import { FakeDoor } from "./fake-door";
import { Feedback } from "./feedback";
import { FormNotice } from "./form-notice";
import { Updated } from "./local-time";
import { NativeForm } from "./native-form";
import { PaginatedList } from "./paginated-list";
import { ComingSoon, HubBand, withTab } from "./public-hub";
import { ShareAction } from "./share-action";
import { StartCollectionPrompt } from "./start-collection-prompt";

type Tab = "collections" | "shared" | "saved" | "subscriptions" | "communities";

// The owner's own hub is their home: the same band as visitors see, with
// View as a visitor and Hub settings, then their collections and what others
// shared with them or they saved.
export async function OwnedHub({
  profile,
  cursor,
  returnTo,
  tab,
  notice,
}: {
  profile: Profile;
  cursor?: string;
  returnTo?: string;
  tab?: string;
  notice?: string;
}) {
  const hubId = profile.hubId as string;
  const here = withTab(returnTo ?? `/h/${hubId}`);
  const current: Tab = (["shared", "saved", "subscriptions", "communities"] as const).includes(
    tab as never,
  )
    ? (tab as Tab)
    : "collections";
  const [result, shared, saved] = await Promise.all([
    operatorRead<Collection[]>(
      withCursor(`/api/v1/hubs/${hubId}/collections`, cursor),
      `/h/${hubId}`,
    ),
    serverRead<SharedCollection[]>("/api/v1/me/shared"),
    serverRead<SavedCollection[]>("/api/v1/me/saved"),
  ]);
  if (!result.ok) return <Feedback error={result} resetPath={`/h/${hubId}`} />;
  const empty = !result.data.length && !cursor;
  return (
    <div className="band-page own-hub" data-reader>
      <FormNotice code={notice} />
      <HubBand
        hub={{
          id: hubId,
          name: profile.hubName ?? "Your hub",
          handle: profile.handle,
          description: profile.hubDescription,
          owner: profile.showOwner ? { username: profile.username } : null,
          ownerName: profile.showOwner ? profile.displayName : null,
        }}
        actions={
          <>
            <a className="button band-ghost" href={`/h/${hubId}?view=public`}>
              View as a visitor
            </a>
            <a className="button band-ghost" href="/settings?section=hub">
              Hub settings
            </a>
            <ShareAction
              target={{ kind: "hub", id: hubId }}
              returnTo={here}
              className="button band-ghost"
            />
          </>
        }
      />
      <div className="band-body">
        <nav className="page-tabs" aria-label="Your hub">
          <a href={withTab(here)} aria-current={current === "collections" ? "page" : undefined}>
            My collections{" "}
            {profile.hubCollectionCount !== null && <span>{profile.hubCollectionCount}</span>}
          </a>
          <a
            href={withTab(here, "shared")}
            aria-current={current === "shared" ? "page" : undefined}
          >
            Shared with me {shared.ok && <span>{shared.data.length}</span>}
          </a>
          <a href={withTab(here, "saved")} aria-current={current === "saved" ? "page" : undefined}>
            Saved {saved.ok && <span>{saved.data.length}</span>}
          </a>
          <FakeDoor
            feature="subscriptions"
            returnTo={withTab(here, "subscriptions")}
            notice={false}
            className="tab-button"
            current={current === "subscriptions"}
          >
            Subscriptions
          </FakeDoor>
          <FakeDoor
            feature="communities"
            returnTo={withTab(here, "communities")}
            notice={false}
            className="tab-button"
            current={current === "communities"}
          >
            Communities
          </FakeDoor>
        </nav>
        {current === "shared" ? (
          shared.ok ? (
            <SharedRows items={shared.data} />
          ) : (
            <p className="empty" role="status">
              This list couldn't load. <a href={withTab(here, "shared")}>Try again</a>.
            </p>
          )
        ) : current === "saved" ? (
          saved.ok ? (
            <SavedRows items={saved.data} returnTo={withTab(here, "saved")} />
          ) : (
            <p className="empty" role="status">
              This list couldn't load. <a href={withTab(here, "saved")}>Try again</a>.
            </p>
          )
        ) : current === "subscriptions" ? (
          <ComingSoon title="Subscriptions are on the way">
            Hubs you subscribe to will be listed here with their newest collections, each with its
            own notifications bell. Thanks for looking; it tells us people want this.
          </ComingSoon>
        ) : current === "communities" ? (
          <ComingSoon title="Communities are on the way">
            Communities you belong to, and requests waiting for an owner, will be listed here.
            Thanks for looking; it tells us people want this.
          </ComingSoon>
        ) : empty ? (
          <StartCollectionPrompt
            hubAddress={
              profile.handle
                ? `${new URL(webServerConfig().publicOrigin).host}/@${profile.handle}`
                : undefined
            }
          />
        ) : (
          <PaginatedList
            kind="collections"
            layout="rows"
            path={`/api/v1/hubs/${hubId}/collections`}
            initial={result.data}
            nextCursor={result.meta?.nextCursor}
          />
        )}
      </div>
    </div>
  );
}

// Collections other people shared with the owner, with the access they have.
function SharedRows({ items }: { items: SharedCollection[] }) {
  if (!items.length) return <p className="empty">Nothing has been shared with you yet.</p>;
  return (
    <ul className="collection-rows">
      {items.map((item) => (
        <li key={item.id} className="owned-row collection-item">
          <div>
            <a className="owned-row-title" href={permalink(item.id)}>
              {item.title}
            </a>
            {item.description && <span className="owned-row-description">{item.description}</span>}
            <span className="owned-row-meta">
              <span className="visibility-pill is-published">
                {item.shareRole === "contributor" ? "Contributor" : "Viewer"}
              </span>
              <span>
                {item.hub ? `${item.hub.name} · ` : ""}Updated <Updated at={item.updatedAt} />
              </span>
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

// Collections the owner saved. A save whose collection is no longer readable
// keeps its place, cannot be opened, and can be removed.
function SavedRows({ items, returnTo }: { items: SavedCollection[]; returnTo: string }) {
  if (!items.length)
    return <p className="empty">Collections you save from Discover and hubs appear here.</p>;
  return (
    <ul className="collection-rows">
      {items.map((item) => (
        <li
          key={item.id}
          className={`owned-row collection-item${item.available ? "" : " is-unavailable"}`}
        >
          <div>
            {item.available ? (
              <a className="owned-row-title" href={permalink(item.id)}>
                {item.title}
              </a>
            ) : (
              <span className="owned-row-title">{item.title}</span>
            )}
            {item.description && <span className="owned-row-description">{item.description}</span>}
            <span className="owned-row-meta">
              <span className={`visibility-pill${item.available ? " is-published" : ""}`}>
                {item.available ? "Published" : "Currently unavailable"}
              </span>
              {item.available ? (
                <span>
                  {item.hub ? `${item.hub.name} · ` : ""}Updated <Updated at={item.updatedAt} />
                </span>
              ) : (
                <span>
                  Saved <Updated at={item.savedAt} />
                </span>
              )}
            </span>
          </div>
          {!item.available && (
            <NativeForm action="/forms/collection-unsave" className="row-action">
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <button
                type="submit"
                className="text-button"
                aria-label={`Remove ${item.title} from saved`}
              >
                Remove
              </button>
            </NativeForm>
          )}
        </li>
      ))}
    </ul>
  );
}
