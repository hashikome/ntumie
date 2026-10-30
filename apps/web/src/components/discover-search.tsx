import { type DiscoverSearchResult, maxSearchLength, type PopularTag } from "@ntumie/types";
import { type ApiPath, queryValue } from "../lib/http";
import { serverRead } from "../lib/server-api";
import { Feedback } from "./feedback";
import { FormNotice } from "./form-notice";
import { HubCard } from "./hub-card";
import { SearchResults } from "./search-results";

const plural = (count: number, one: string) => `${count} ${count === 1 ? one : `${one}s`}`;
const address = (params: Record<string, string | undefined>) => {
  const query = new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
  return query.size ? `/discover?${query}` : "/discover";
};

// A plain GET form: a search is a shareable address and needs no JavaScript.
// An empty search returns to Everything (or the tag being browsed).
export function SearchBox({ q = "", tag }: { q?: string; tag?: string }) {
  return (
    <search>
      <form action="/discover" method="get" className="action-form search-box">
        {tag && <input type="hidden" name="tag" value={tag} />}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="m20 20-4-4" />
        </svg>
        <input
          name="q"
          type="search"
          aria-label="Search collections"
          placeholder="Search collections, topics or tags"
          defaultValue={q}
          maxLength={maxSearchLength}
        />
        <button type="submit" className="button primary">
          Search
        </button>
      </form>
    </search>
  );
}

// The tag being filtered by: removing it, or everything, is one link away.
export function TagFilter({
  tag,
  removeHref,
  clearHref = "/discover",
}: {
  tag: string;
  removeHref: string;
  clearHref?: string;
}) {
  return (
    <div className="filter-chips">
      <span className="filter-chip">
        Tag: {tag}
        <a href={removeHref}>
          <span className="sr-only">Remove tag filter {tag}</span>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </a>
      </span>
      <a href={clearHref}>Clear all</a>
    </div>
  );
}

// Discover's search results (board "Discover · search results"): matching hubs
// first, then collections by best match with their matched words marked.
export async function DiscoverSearch({
  q,
  tag,
  query,
}: {
  q: string;
  tag?: string;
  query: Record<string, string | string[] | undefined>;
}) {
  const cursor = queryValue(query.cursor);
  const hubsOnly = queryValue(query.tab) === "hubs";
  const params = { q, ...(tag ? { tag } : {}), ...(hubsOnly ? { scope: "hubs" } : {}) };
  const path = `/api/v1/discover/search?${new URLSearchParams(params)}` as ApiPath;
  const read = await serverRead<DiscoverSearchResult>(
    (cursor ? `${path}&cursor=${encodeURIComponent(cursor)}` : path) as ApiPath,
  );
  const here = address({ q, tag, tab: hubsOnly ? "hubs" : undefined });
  // Text with no words in it ("!!!") simply finds nothing.
  if (!read.ok && read.status !== 400) return <Feedback error={read} resetPath={here} />;
  const found: DiscoverSearchResult = read.ok
    ? read.data
    : { query: q, hubs: [], hubTotal: 0, collections: [], collectionTotal: 0 };
  const nextCursor = read.ok ? (read.meta?.nextCursor ?? null) : null;
  const nextHref = nextCursor
    ? `${here}${here.includes("?") ? "&" : "?"}cursor=${encodeURIComponent(nextCursor)}`
    : null;
  const nothing = !found.hubTotal && !found.collectionTotal;
  const popular = found.collectionTotal
    ? null
    : await serverRead<PopularTag[]>("/api/v1/discover/tags?limit=6");
  return (
    <div className="band-page discover-page" data-reader>
      <FormNotice code={queryValue(query.notice)} />
      <section className="brand-band page-band discover-band" aria-labelledby="discover-title">
        <h1 id="discover-title">Discover</h1>
        <SearchBox q={q} tag={tag} />
      </section>
      <div className="band-body discover-results">
        {tag && <TagFilter tag={tag} removeHref={address({ q })} />}
        {found.hubTotal > 0 && (
          <section className="discover-section" aria-labelledby="search-hubs-title">
            <div className="band-section-head">
              <h2 id="search-hubs-title">
                {plural(found.hubTotal, "hub")} for “{found.query}”
              </h2>
              {!hubsOnly && found.hubTotal > found.hubs.length && (
                <a href={address({ q, tag, tab: "hubs" })}>See all</a>
              )}
            </div>
            <ul className={`hub-cards ${hubsOnly ? "cards-3" : "cards-2"}`}>
              {found.hubs.map((hub) => (
                <HubCard key={hub.id} hub={hub} returnTo={here} />
              ))}
            </ul>
            {hubsOnly && nextHref && (
              <div className="continuation">
                <a className="button" href={nextHref}>
                  Show more hubs
                </a>
              </div>
            )}
          </section>
        )}
        {!hubsOnly && found.collectionTotal > 0 && (
          <section aria-labelledby="search-collections-title">
            <div className="band-section-head">
              <h2 id="search-collections-title">
                {plural(found.collectionTotal, "collection")} for “{found.query}”
              </h2>
              <span className="meta">Best match</span>
            </div>
            <SearchResults
              path={path}
              initial={found.collections}
              nextCursor={nextCursor}
              nextHref={nextHref}
            />
          </section>
        )}
        {!hubsOnly && !found.collectionTotal && (
          <div className={`search-empty${nothing ? "" : " after-hubs"}`}>
            <h2>No collections for “{found.query}”</h2>
            <p>Check the spelling, try a broader word, or browse a popular tag.</p>
            {popular?.ok && popular.data.length > 0 && (
              <nav className="search-empty-tags" aria-label="Popular tags">
                {popular.data.map(({ name }) => (
                  <a key={name} href={address({ tag: name })}>
                    {name}
                  </a>
                ))}
              </nav>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
