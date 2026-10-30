import {
  type Collection,
  type DiscoverOverview,
  type HubCard as HubCardData,
  maxSearchLength,
} from "@ntumie/types";
import type { Metadata } from "next";
import { CollectionCard } from "../../components/collection-card";
import { DiscoverSearch, SearchBox, TagFilter } from "../../components/discover-search";
import { Feedback } from "../../components/feedback";
import { FormNotice } from "../../components/form-notice";
import { HubCard } from "../../components/hub-card";
import { PaginatedList } from "../../components/paginated-list";
import { type ApiPath, queryValue, withCursor } from "../../lib/http";
import { serverRead } from "../../lib/server-api";

export const metadata: Metadata = { title: "Discover" };
export const dynamic = "force-dynamic";

type Tab = "everything" | "popular" | "newest" | "hubs";
const tabs: Array<[Tab, string]> = [
  ["everything", "Everything"],
  ["popular", "Popular"],
  ["newest", "Newest"],
  ["hubs", "Hubs"],
];
const tabPath = (tab: Tab) => (tab === "everything" ? "/discover" : `/discover?tab=${tab}`);

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const requested = queryValue(query.tab);
  const tag = queryValue(query.tag, 80)?.trim().toLowerCase() || undefined;
  const q = queryValue(query.q, maxSearchLength)?.trim();
  if (q) return <DiscoverSearch q={q} tag={tag} query={query} />;
  const cursor = queryValue(query.cursor);
  // A list cursor only continues the newest list (older links carry no tab).
  const tab: Tab = tabs.some(([key]) => key === requested)
    ? (requested as Tab)
    : cursor
      ? "newest"
      : "everything";
  const here = tag ? `/discover?tag=${encodeURIComponent(tag)}` : tabPath(tab);
  const order = queryValue(query.order) === "newest" ? "newest" : "popular";
  // One read per view; a failed read shows the page-level error.
  const read = tag
    ? await serverRead<Collection[]>(
        withCursor(`/api/v1/discover?tag=${encodeURIComponent(tag)}` as ApiPath, cursor),
      )
    : tab === "popular"
      ? await serverRead<Collection[]>("/api/v1/discover/popular?limit=24")
      : tab === "newest"
        ? await serverRead<Collection[]>(withCursor("/api/v1/discover", cursor))
        : tab === "hubs"
          ? await serverRead<HubCardData[]>(`/api/v1/discover/hubs?limit=24&order=${order}`)
          : await serverRead<DiscoverOverview>("/api/v1/discover/overview");
  if (!read.ok) return <Feedback error={read} resetPath={here} />;
  const overview = tab === "everything" && !tag ? (read.data as DiscoverOverview) : null;
  return (
    <div className="band-page discover-page" data-reader>
      <FormNotice code={queryValue(query.notice)} />
      <section className="brand-band page-band discover-band" aria-labelledby="discover-title">
        <h1 id="discover-title">Discover</h1>
        <p className="band-lead">
          Guides people put together around one idea, and the hubs that make them.
        </p>
        <SearchBox tag={tag} />
        {overview && overview.tags.length > 0 && (
          <nav className="popular-tags" aria-label="Popular tags">
            <span>Popular:</span>
            {overview.tags.map(({ name }) => (
              <a
                key={name}
                href={`/discover?tag=${encodeURIComponent(name)}`}
                aria-current={tag === name ? "page" : undefined}
              >
                {name}
              </a>
            ))}
          </nav>
        )}
        {!tag && (
          <nav className="discover-tabs" aria-label="Discover">
            {tabs.map(([key, label]) => (
              <a key={key} href={tabPath(key)} aria-current={key === tab ? "page" : undefined}>
                {label}
              </a>
            ))}
          </nav>
        )}
      </section>
      <div className="band-body">
        {tag ? (
          <Tagged tag={tag} items={read.data as Collection[]} nextCursor={read.meta?.nextCursor} />
        ) : tab === "popular" ? (
          <Popular items={read.data as Collection[]} />
        ) : tab === "newest" ? (
          <Newest items={read.data as Collection[]} nextCursor={read.meta?.nextCursor} />
        ) : tab === "hubs" ? (
          <Hubs hubs={read.data as HubCardData[]} order={order} />
        ) : (
          overview && <Everything overview={overview} />
        )}
      </div>
    </div>
  );
}

// Everything: a taste of each list, each with its way to see all.
function Everything({ overview }: { overview: DiscoverOverview }) {
  const { popular, hubs, newest } = overview;
  return (
    <>
      {popular.length > 0 && (
        <section className="discover-section" aria-labelledby="popular-title">
          <SectionHead
            id="popular-title"
            title="Popular this month"
            more="See all popular"
            href={tabPath("popular")}
          />
          <ul className="collection-cards cards-3">
            {popular.map((item) => (
              <CollectionCard key={item.id} item={item} />
            ))}
          </ul>
        </section>
      )}
      {hubs.length > 0 && (
        <section className="discover-section" aria-labelledby="hubs-title">
          <SectionHead
            id="hubs-title"
            title="Hubs worth subscribing to"
            more="See all hubs"
            href={tabPath("hubs")}
          />
          <ul className="hub-cards cards-4">
            {hubs.map((hub) => (
              <HubCard key={hub.id} hub={hub} returnTo="/discover" />
            ))}
          </ul>
        </section>
      )}
      <section className="discover-section" aria-labelledby="newest-title">
        <SectionHead
          id="newest-title"
          title="Newest collections"
          more="See all newest"
          href={tabPath("newest")}
        />
        {newest.length ? (
          <ul className="collection-cards">
            {newest.map((item) => (
              <CollectionCard key={item.id} item={item} />
            ))}
          </ul>
        ) : (
          <p className="empty">No published collections yet.</p>
        )}
      </section>
    </>
  );
}

function Popular({ items }: { items: Collection[] }) {
  return (
    <section aria-labelledby="popular-title">
      <SectionHead
        id="popular-title"
        title="Popular this month"
        note="Most saved in the last 30 days"
      />
      {items.length ? (
        <ul className="collection-cards">
          {items.map((item) => (
            <CollectionCard key={item.id} item={item} />
          ))}
        </ul>
      ) : (
        <p className="empty">Nothing has been saved this month yet.</p>
      )}
    </section>
  );
}

function Newest({ items, nextCursor }: { items: Collection[]; nextCursor?: string | null }) {
  return (
    <section aria-labelledby="newest-title">
      <SectionHead id="newest-title" title="Newest collections" />
      <PaginatedList
        kind="collections"
        layout="cards"
        path="/api/v1/discover"
        initial={items}
        nextCursor={nextCursor}
        pageParams={{ tab: "newest" }}
      />
    </section>
  );
}

function Tagged({
  tag,
  items,
  nextCursor,
}: {
  tag: string;
  items: Collection[];
  nextCursor?: string | null;
}) {
  return (
    <section aria-labelledby="tagged-title">
      <TagFilter tag={tag} removeHref="/discover" />
      <SectionHead id="tagged-title" title={`Collections tagged “${tag}”`} />
      <PaginatedList
        kind="collections"
        layout="cards"
        path={`/api/v1/discover?tag=${encodeURIComponent(tag)}`}
        initial={items}
        nextCursor={nextCursor}
        pageParams={{ tag }}
      />
    </section>
  );
}

function Hubs({ hubs, order }: { hubs: HubCardData[]; order: "popular" | "newest" }) {
  const returnTo = `/discover?tab=hubs${order === "newest" ? "&order=newest" : ""}`;
  return (
    <section aria-labelledby="all-hubs-title">
      <div className="band-section-head">
        <h2 id="all-hubs-title">Hubs</h2>
        <span className="meta">
          {order === "popular" ? (
            <>
              Most saved this month · <a href="/discover?tab=hubs&order=newest">Newest</a>
            </>
          ) : (
            <>
              <a href="/discover?tab=hubs">Most saved this month</a> · Newest
            </>
          )}
        </span>
      </div>
      {hubs.length ? (
        <ul className="hub-cards cards-3">
          {hubs.map((hub) => (
            <HubCard key={hub.id} hub={hub} returnTo={returnTo} />
          ))}
        </ul>
      ) : (
        <p className="empty">No hubs have published a collection yet.</p>
      )}
    </section>
  );
}

function SectionHead({
  id,
  title,
  more,
  href,
  note,
}: {
  id: string;
  title: string;
  more?: string;
  href?: string;
  note?: string;
}) {
  return (
    <div className="band-section-head">
      <h2 id={id}>{title}</h2>
      {more && href ? (
        <a href={href}>{more}</a>
      ) : note ? (
        <span className="meta">{note}</span>
      ) : null}
    </div>
  );
}
