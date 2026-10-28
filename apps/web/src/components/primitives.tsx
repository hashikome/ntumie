import type { PersonRef } from "@ntumie/types";
import { permalink } from "../lib/http";
import { ItemDetails } from "./item-details";
import { ItemDisclosure } from "./item-disclosure";
import { ResourceLink } from "./resource-navigation";
import type { ResourcePresentation } from "./resource-presentation";

export function Tags({
  tags,
  limit = tags.length,
  expandable = false,
}: {
  tags: string[];
  limit?: number;
  expandable?: boolean;
}) {
  const remaining = Math.max(0, tags.length - limit);
  if (expandable && remaining > 0) {
    return (
      <details className="tag-overflow">
        <summary>
          <span className="tag-preview">
            {tags.slice(0, limit).map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
          </span>
          <span className="tags-more">+{remaining} more</span>
          <span className="tags-less">Fewer tags</span>
        </summary>
        {/* biome-ignore lint/a11y/noNoninteractiveTabindex: Overflowing tags need keyboard scrolling. */}
        <ul className="tags" aria-label="All collection tags" tabIndex={0}>
          {tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      </details>
    );
  }
  return tags.length ? (
    <ul className="tags" aria-label="Tags">
      {tags.slice(0, limit).map((tag) => (
        <li key={tag}>{tag}</li>
      ))}
      {remaining > 0 && (
        <li className="resource-tag-count" title={tags.slice(limit).join(", ")}>
          +{remaining} {remaining === 1 ? "tag" : "tags"}
        </li>
      )}
    </ul>
  ) : null;
}

// People link to their own profile; hubs keep their separate @handle identity.
export function Person({ person }: { person: PersonRef }) {
  return (
    <a className="person" href={`/${encodeURIComponent(person.username)}`}>
      <span className="person-handle">{person.username}</span>
    </a>
  );
}
export function ResourceRow({
  item,
  itemBase,
  expanded = false,
  onExpandedChange,
  preview = false,
  discussBase,
  noteCollection,
}: {
  item: ResourcePresentation;
  itemBase?: string | null;
  expanded?: boolean;
  preview?: boolean;
  onExpandedChange?: (open: boolean) => void;
  discussBase?: string;
  /** Set for people who can edit: the item offers "Add a note". */
  noteCollection?: string;
}) {
  const ResourceTitle = preview ? "h4" : "h3";
  // The demo links back to its own selectable example, never a fictional record.
  const detailsUrl = new URL(
    itemBase ?? (preview ? "/" : permalink(item.collectionId)),
    "http://local.invalid",
  );
  detailsUrl.searchParams.set("item", item.id);
  detailsUrl.hash = `item-${item.id}`;
  if (item.kind === "heading")
    return (
      <li className="resource-heading">
        <h2>{item.title}</h2>
        {item.description && <p className="section-description">{item.description}</p>}
      </li>
    );
  let url: URL | undefined;
  try {
    const value = new URL(item.url ?? "");
    if (["http:", "https:"].includes(value.protocol)) url = value;
  } catch {}
  const internal =
    item.kind === "site_link" && /^\/(?![/\\])/.test(item.url ?? "") && !item.url?.includes("\\");
  const reference = item.kind === "collection_link";
  const destination = reference
    ? item.linkedCollection && permalink(item.linkedCollection.id)
    : internal
      ? item.url
      : url?.href;
  const title = reference
    ? item.linkedCollection?.title || "Collection unavailable"
    : item.title || url?.href || "Link unavailable";
  return (
    <li
      className={`resource-row${reference && !destination ? " resource-unavailable" : ""}`}
      id={`item-${item.id}`}
    >
      <ItemDisclosure
        expanded={expanded}
        preview={preview}
        itemId={item.id}
        collectionId={item.collectionId}
        onExpandedChange={onExpandedChange}
      >
        <summary aria-label={`Details: ${title}`}>
          <ResourceTitle>
            {destination && !(preview && reference) ? (
              <ResourceLink href={destination}>{title}</ResourceLink>
            ) : (
              title
            )}
          </ResourceTitle>
          <div className="meta resource-meta">
            {internal ? (
              <span>ntumie.</span>
            ) : reference ? (
              destination ? (
                <>
                  <CollectionIcon />
                  <span className="resource-kind">Collection</span>
                </>
              ) : (
                <span>This collection may be private or no longer available.</span>
              )
            ) : (
              url && (
                <>
                  {item.collectionHint && <span className="resource-kind">Collection</span>}
                  <span>{url.hostname.replace(/^www\./, "")}</span>
                </>
              )
            )}
            <Tags tags={item.tags} />
          </div>
        </summary>
        <ItemDetails
          preview={preview}
          item={item}
          discussHref={discussHref(discussBase, item.id)}
          noteCollection={noteCollection}
          permalink={
            itemBase === null
              ? undefined
              : detailsUrl.pathname + detailsUrl.search + detailsUrl.hash
          }
        />
      </ItemDisclosure>
    </li>
  );
}
// "Discuss" opens the reader's comment box with this item attached.
function discussHref(base: string | undefined, itemId: string) {
  if (!base) return undefined;
  const url = new URL(base, "http://local.invalid");
  url.searchParams.set("compose", "comment");
  url.searchParams.set("attach", itemId);
  return `${url.pathname}${url.search}#comment-composer`;
}
function CollectionIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="resource-kind"
    >
      <rect x="3" y="7" width="14" height="14" rx="2.5" />
      <path d="M7 3h11.5A2.5 2.5 0 0 1 21 5.5V17" />
    </svg>
  );
}
