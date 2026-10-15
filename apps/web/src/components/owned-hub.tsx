import { webServerConfig } from "@ntumie/config/web-server";
import type { Collection, Profile } from "@ntumie/types";
import { withCursor } from "../lib/http";
import { operatorRead } from "../lib/operator-read";
import { Feedback } from "./feedback";
import { PaginatedList } from "./paginated-list";
import { HubBand } from "./public-hub";
import { ShareAction } from "./share-action";
import { StartCollectionPrompt } from "./start-collection-prompt";

// The owner's own hub is their home: the same band as visitors see, with
// View as a visitor and Hub settings, then every collection they keep.
export async function OwnedHub({
  profile,
  cursor,
  returnTo,
}: {
  profile: Profile;
  cursor?: string;
  returnTo?: string;
}) {
  const result = await operatorRead<Collection[]>(
    withCursor(`/api/v1/hubs/${profile.hubId}/collections`, cursor),
    `/h/${profile.hubId}`,
  );
  if (!result.ok) return <Feedback error={result} resetPath={`/h/${profile.hubId}`} />;
  const hubId = profile.hubId as string;
  return (
    <div className="band-page own-hub" data-reader>
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
              returnTo={returnTo ?? `/h/${hubId}`}
              className="button band-ghost"
            />
          </>
        }
      />
      <section className="band-body">
        {result.data.length || cursor ? (
          <>
            <div className="band-section-head">
              <h2 id="my-collections-title">My collections</h2>
              {profile.hubCollectionCount !== null && (
                <span className="meta">{profile.hubCollectionCount}</span>
              )}
            </div>
            <PaginatedList
              kind="collections"
              layout="rows"
              path={`/api/v1/hubs/${hubId}/collections`}
              initial={result.data}
              nextCursor={result.meta?.nextCursor}
            />
          </>
        ) : (
          <StartCollectionPrompt
            hubAddress={
              profile.handle
                ? `${new URL(webServerConfig().publicOrigin).host}/@${profile.handle}`
                : undefined
            }
          />
        )}
      </section>
    </div>
  );
}
