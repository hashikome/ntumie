import type { Collection } from "@ntumie/types";
import { permalink } from "../lib/http";
import { Avatar } from "./avatar";
import { HubMark } from "./hub-mark";
import { Updated } from "./local-time";

const plural = (count: number, one: string) => `${count} ${count === 1 ? one : `${one}s`}`;

// "4 sections · 8 resources · 24 saves", leaving out what a listing did not count
// and saves while there are none.
export function CollectionCounts({ item }: { item: Collection }) {
  const parts = [
    item.sectionCount !== undefined && plural(item.sectionCount, "section"),
    item.resourceCount !== undefined && plural(item.resourceCount, "resource"),
    item.saveCount ? plural(item.saveCount, "save") : false,
  ].filter(Boolean);
  return parts.length ? <span>{parts.join(" · ")}</span> : null;
}

// Discover and a hub's page to visitors: one card per collection. The title is
// the link and its target covers the card, so the link's name stays the title.
export function CollectionCard({ item, showHub = true }: { item: Collection; showHub?: boolean }) {
  return (
    <li className="collection-card collection-item">
      <h3 className="collection-card-title">
        <a href={permalink(item.id)}>{item.title}</a>
      </h3>
      {item.description && <p>{item.description}</p>}
      {item.tags.length > 0 && (
        <span className="card-tags">
          {item.tags.slice(0, 3).map((tag) => (
            <span className="tag" key={tag}>
              {tag}
            </span>
          ))}
        </span>
      )}
      {showHub && item.hub && (
        <span className="card-meta card-hub">
          <HubMark hubId={item.hub.id} />
          <span>{item.hub.name}</span>
        </span>
      )}
      <span className="card-meta">
        <CollectionCounts item={item} />
      </span>
    </li>
  );
}

// The owner's hub: rows with who can see each collection and who shapes it.
export function OwnedCollectionRow({ item }: { item: Collection }) {
  const others = item.contributors?.people ?? [];
  return (
    <li className="owned-row collection-item">
      <div>
        <a className="owned-row-title" href={permalink(item.id)}>
          {item.title}
        </a>
        {item.description && <span className="owned-row-description">{item.description}</span>}
        <span className="owned-row-meta">
          <span className={`visibility-pill${item.published ? " is-published" : ""}`}>
            {item.published ? "Published" : item.linkSharingEnabled ? "Link sharing on" : "Private"}
          </span>
          <span>
            Updated <Updated at={item.updatedAt} />
            {item.resourceCount !== undefined && ` · ${plural(item.resourceCount, "resource")}`}
            {item.saveCount ? ` · ${plural(item.saveCount, "save")}` : ""}
          </span>
        </span>
      </div>
      {others.length > 0 && (
        <span
          className="avatar-stack"
          role="img"
          aria-label={`Also shaped by ${others.map((person) => person.username).join(", ")}${
            (item.contributors?.total ?? 0) > others.length
              ? ` and ${(item.contributors?.total ?? 0) - others.length} more`
              : ""
          }`}
        >
          {others.slice(0, 3).map((person) => (
            <Avatar key={person.userId} userId={person.userId} />
          ))}
        </span>
      )}
    </li>
  );
}
