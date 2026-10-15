import type { HubCard as HubCardData } from "@ntumie/types";
import { FakeDoor } from "./fake-door";
import { HubMark } from "./hub-mark";

const plural = (count: number, one: string) => `${count} ${count === 1 ? one : `${one}s`}`;

// Discover's hub card: who runs it, what it is about and how much is in it.
export function HubCard({ hub, returnTo }: { hub: HubCardData; returnTo: string }) {
  const ownerName = hub.ownerName?.trim();
  return (
    <li className="hub-card">
      <div className="hub-card-head">
        <HubMark hubId={hub.id} size={44} />
        <div>
          <h3>
            <a href={`/h/${hub.id}`}>{hub.name}</a>
          </h3>
          <span>
            @{hub.handle}
            {ownerName && hub.owner ? ` by ${ownerName}` : ""}
          </span>
        </div>
      </div>
      {hub.description && <p>{hub.description}</p>}
      <span className="hub-card-stats">
        {plural(hub.publishedCollectionCount, "collection")}
        {hub.collectionSaves > 0 && ` · ${plural(hub.collectionSaves, "save")}`}
      </span>
      <FakeDoor feature="subscriptions" returnTo={returnTo} className="button">
        Subscribe
      </FakeDoor>
    </li>
  );
}
