import type { HubPage } from "@ntumie/types";
import { HubMark } from "./hub-mark";
import { PaginatedList } from "./paginated-list";
import { ShareAction } from "./share-action";

export function PublicHub({
  data,
  nextCursor,
  preview = false,
  returnTo,
}: {
  data: HubPage;
  nextCursor?: string | null;
  preview?: boolean;
  returnTo?: string;
}) {
  const { hub, collections } = data;
  return (
    <div className="band-page public-hub" data-reader>
      <HubBand
        hub={hub}
        actions={
          <ShareAction
            target={{ kind: "hub", id: hub.id }}
            returnTo={returnTo ?? `/h/${hub.id}${preview ? "?view=public" : ""}`}
            className="button band-ghost"
          />
        }
      />
      <section className="band-body" aria-labelledby="hub-collections-title">
        <div className="band-section-head">
          <h2 id="hub-collections-title">Published collections</h2>
          <span className="meta">{hub.publishedCollectionCount}</span>
        </div>
        <PaginatedList
          kind="collections"
          layout="cards"
          showHub={false}
          path={`/api/v1/hubs/${encodeURIComponent(hub.id)}`}
          initial={collections}
          nextCursor={nextCursor}
          publicHub={{ handle: hub.handle, preview }}
        />
      </section>
    </div>
  );
}

// The hub's band: mark, name, "@handle by Owner", description and actions.
export function HubBand({
  hub,
  actions,
}: {
  hub: {
    id: string;
    name: string;
    handle: string | null;
    description: string | null;
    owner: { username: string } | null;
    ownerName: string | null;
  };
  actions: React.ReactNode;
}) {
  const ownerName = hub.ownerName?.trim();
  return (
    <section className="brand-band page-band hub-band" aria-labelledby="hub-title">
      <div className="band-identity">
        <HubMark hubId={hub.id} size={64} />
        <div>
          <h1 id="hub-title">{hub.name}</h1>
          {/* The handle is the hub's; "by Name" only when the owner shows it. */}
          <p className="band-handle">
            {hub.handle && <span className="person-handle">@{hub.handle}</span>}
            {ownerName && hub.owner && (
              <>
                {" by "}
                <a className="person-name" href={`/${encodeURIComponent(hub.owner.username)}`}>
                  {ownerName}
                </a>
              </>
            )}
          </p>
        </div>
      </div>
      {hub.description && <p className="band-lead">{hub.description}</p>}
      <div className="band-actions">{actions}</div>
    </section>
  );
}
