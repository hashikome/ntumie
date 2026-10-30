# Search Discover, and search within a hub

This ExecPlan is a living document. Maintain it according to `PLANS.md`.
Keep `Progress`, `Surprises & Discoveries`, `Decision Log`, and
`Outcomes & Retrospective` current as work proceeds.

## Purpose / Big Picture

Today Discover's search box and the reader's "Search this hub" are fake doors:
they record interest and say search is on the way. After this plan:

1. Typing "compost" on Discover shows the board "Discover · search results"
   (`ref/boards/round2/r2-discover.dc.html`, third frame; rendered in
   `ref/boards/render/r2-discover.png`): "2 hubs for "compost"" (with See all),
   then "12 collections for "compost"" ordered by Best match, matching words
   marked in titles and descriptions, "Show more results", and tag filters
   shown as removable chips ("Tag: soil ×", "Clear all").
2. A search with no match shows the board's empty state: "No collections for
   "compst"", "Check the spelling, try a broader word, or browse a popular
   tag." with popular tag chips.
3. "Search this hub" (Ctrl K) in the reader searches that hub's collections,
   sections and links, and opens the result in place.

Only published collections and published hubs are ever searched for visitors;
private content never contributes to results, counts or highlights.

## Progress

- [x] (2026-10-28) Plan written and reviewed: Postgres full-text search with
  `ts_rank_cd` ranking and `pg_trgm` typo tolerance, behind a `SearchService`
  (owner, 2026-10-29).
- [x] (2026-10-29) Milestone 1: search index and API
  (`GET /api/v1/discover/search?q=&tag=&scope=all|hubs&cursor=&limit=`).
  Migration `20261029090000_discover_search`: `pg_trgm`, the SQL functions
  `collection_search_vector` / `hub_search_vector` and GIN expression indexes
  (partial on published collections), trigram indexes on titles and hub
  names, and a `lower(name) text_pattern_ops` index for tag prefixes. Module
  `apps/api/src/modules/search/` (`SearchService`, the safe `parseSearch`
  with unit tests); e2e `test/discover-search.e2e.spec.ts`.
- [x] (2026-10-30) Milestone 2: Discover search screen to the board
  (`apps/web/src/components/discover-search.tsx`, `search-results.tsx`). The
  box is a plain GET form (`/discover?q=&tag=`, `tab=hubs` for See all); the
  band shows only the title and box; hubs, then collections by Best match with
  `<mark>`ed words; Show more results (in place, or the next page without
  JavaScript); removable tag chip; empty state with popular tags. The Discover
  `search` fake door is gone; the reader's "Search this hub" keeps it until
  milestone 3.
  Card tags are links (owner, 2026-10-31): on results they keep the search and
  add the filter, elsewhere they open the tag.
- [ ] Milestone 3: in-hub search (reader "Search this hub", Ctrl K).
- [ ] Docs, CHANGELOG, browser acceptance.

## Surprises & Discoveries

- Observation: Prisma's parity check ignores expression and partial indexes
  but would drop a plain extra index; the tag-prefix index is therefore on
  `lower(name)` (the query uses the same expression).
  Evidence: `bunx prisma migrate diff --from-config-datasource --to-schema
  prisma/schema.prisma` reported a removed `tags(name)` index until changed;
  now "No difference detected".
- Observation: typos match through word similarity (`q <% lower(title)`,
  threshold 0.5 set per transaction): "kitchn" finds "Starting a kitchen
  garden"; such near-matches carry no highlight (`ts_headline` marks only
  full-text matches). Search text never reaches logs: request logging records
  route templates only (`apps/api/src/common/observability/privacy.ts`).
  Evidence: local spot checks; e2e "finds published collections…".
- Observation: Postgres has only `plpgsql` and `pgcrypto`; no `pg_trgm`, no
  `tsvector` columns. Discover already filters by one tag (`?tag=`).
  Evidence: `select extname from pg_extension`;
  `apps/api/src/modules/collections/dto/discover-query.dto.ts`.

## Decision Log

- Decision: Postgres full-text search (generated `tsvector` columns with GIN
  indexes), not an external search service.
  Rationale: one database, transactional freshness (a published or unpublished
  collection is searchable or gone immediately), no new infrastructure in the
  Dokploy stack; the corpus is small (titles, descriptions, tags, link titles).
  Date/Author: 2026-10-28 / proposed, pending owner review
- Decision: the `simple` text-search configuration with prefix matching, plus
  `unaccent`-free case folding; no stemming.
  Rationale: content is multilingual (English and Swahili already appear);
  English stemming would mis-handle other languages. Prefix matching makes
  "compo" find "compost" as people type.
  Date/Author: 2026-10-28 / proposed
- Decision: typo tolerance from the first milestone with `pg_trgm`
  (trigram similarity on titles and hub names; GIN `gin_trgm_ops` indexes).
  "compst" finds "compost"; the board's empty state remains for searches that
  still match nothing.
  Rationale: cheap, ships with the official Postgres image, and a typo should
  not end a search. `pg_trgm` is a trusted extension (Postgres 13+), so the
  product database's owner role can create it; if the shared instance's
  migration role cannot, an operator creates it once per database.
  Date/Author: 2026-10-29 / owner
- Decision: rank with `ts_rank_cd` (relevance by term frequency, field weight
  and proximity: title A, description B, tags C) plus a smaller trigram
  similarity term for near-misses, then collection saves, then recency.
  Rationale: owner asked that results be ranked by content; `ts_rank_cd`
  rewards terms appearing close together, which suits short titles.
  Date/Author: 2026-10-29 / owner
- Decision: search sits behind one API service, `SearchService`
  (`apps/api/src/modules/search/`), with its own result types; Discover and the
  reader depend on the API contract only.
  Rationale: moving to a dedicated engine later changes one module. Move to
  Meilisearch (or Typesense) only when one of these holds: search latency stays
  above about 100 ms at p95 after index tuning; ranking or typo tolerance needs
  more than weights and trigrams; faceting across millions of rows. Never
  Elasticsearch/OpenSearch for this corpus. An external engine must not hold
  private content: in-hub search for owners and contributors stays in Postgres
  behind the policy service.
  Date/Author: 2026-10-29 / owner
- Decision: the query lives in the Discover URL (`/discover?q=compost&tag=soil`)
  so results can be shared and the back button works; such responses are never
  edge-cached (`q` is not in the public query allow-list).
  Rationale: Discover is a public reading surface (unlike the operator console,
  whose search text stays out of URLs). Search text is never written to logs,
  analytics properties or audit records.
  Date/Author: 2026-10-28 / proposed

## Outcomes & Retrospective

Not started.

## Context And Orientation

- Discover API: `apps/api/src/modules/collections/discover.controller.ts`
  (`/api/v1/discover`, literal routes before parameter routes) backed by
  `CollectionsService.discover*` in `collections.service.ts`. Visibility rule
  for public lists: `published: true` plus `availableCollections()` from
  `apps/api/src/modules/hubs/availability.ts` (active owner, no active hold).
- Hubs: one per user at most (ADR-0018, ADR-0069); a hub is public through its
  published collections. Hub cards come from `discoverHubs`.
- Tags are relational (ADR-0032): collection tags and item tags in their own
  tables; popular tags from `popularTags`.
- Web: `apps/web/src/app/discover/page.tsx` renders the tabs and sections; the
  search box and the reader's "Search this hub" use `FakeDoor` with feature
  `search` (`apps/web/src/components/fake-door.tsx`, notice `soon-search`).
- Edge cache: `apps/web/server/edge-cache.ts` (`publicQuery` allow-list).
- Boards: `ref/boards/round2/r2-discover.dc.html` (desktop) and
  `r2-discover-phone.dc.html`; reader search affordance in `r2-collection`.
- Schema changes follow `docs/runbooks/migrations.md`
  (`bunx prisma migrate dev --create-only`, then review: generated columns and
  GIN indexes live only in migration SQL and must survive future diffs).

## Plan Of Work

**Milestone 1, index and API.** Add a migration with generated `tsvector`
columns: collections (title weight A, description B, collection tags C),
hubs (name A, handle A, description B) and resources (link title A, note B,
item tags C) for in-hub search; GIN indexes on each. Add
`GET /api/v1/discover/search?q=&tag=&cursor=&limit=` returning
`{ hubs: HubCard[] (first 4, with total), collections: Collection[] (page),
total, highlights }`, ordered by `ts_rank_cd` then saves then recency, keyset
paginated. Query parsing: trim, cap at 100 characters, split into words, each
word as a prefix term (`word:*`) joined with AND; an empty query is a 400.
Highlights are computed by the API (`ts_headline` with fixed markers the web
turns into `<mark>`), so clients never re-implement matching. The private
allowance, holds and inactive owners are excluded by the same
`availableCollections()` rule as every public list.

**Milestone 2, Discover screen.** The search form submits `GET
/discover?q=` (works without JavaScript). Results render to the board: hubs
row (up to 4 cards, "See all" to `?q=&tab=hubs`), collections list with
"Best match" order label and "Show more results" (cursor), tag chips with ×
and Clear all, matched words in `<mark>`. Empty state with popular tags.
Remove the Discover `search` fake door; keep `interestFeatures` entry until
in-hub search ships.

**Milestone 3, in-hub search.** "Search this hub" opens a dialog (Ctrl K)
over the reader: one field, results grouped as collections, sections and
links within this hub; visitors search published collections only, the
owner and contributors also their readable private ones (through the policy
service, never a separate rule). Selecting a link opens it in its
collection (`?item=`). Without JavaScript, the button links to
`/@handle?q=` which renders the same results as a page.

## Concrete Steps

Run from the repository root:

```bash
bun run infra:up
cd apps/api && bunx prisma migrate dev --create-only --name discover_search
# review the SQL: generated columns + GIN indexes; then apply
bunx prisma migrate dev && cd ../..
bun run verify
bun run test:browser
```

Expected: verify green; new API e2e (`test/discover-search.e2e.spec.ts`) and
browser tests pass.

## Validation And Acceptance

- API e2e: a published collection is found by a word in its title, its
  description, a tag, and by a prefix ("compo"); an unpublished, held or
  inactive-owner collection is never found, counted or highlighted; hubs match
  by name, handle and description; ranking puts a title match above a
  description match; pagination is stable; a 101-character query is trimmed
  and an empty one is refused.
- In-hub: a visitor finds only published collections of that hub; the owner
  also finds their private ones; a contributor finds shared ones; nobody finds
  another hub's private content.
- Browser: Discover search for a seeded word shows hub and collection sections
  with marked words, tag chip removal, Show more, the empty state, without and
  with JavaScript, at 1440 and 390, light and dark; compared against the board
  renders.
- Search text never appears in API logs or analytics events (checked by test
  on the log output of a search request).

## Idempotence And Recovery

The migration only adds generated columns and indexes; re-running is safe and
rolling back drops them without touching data. Build indexes concurrently in
production if the tables are large by then (note in the migration).

## Artifacts And Notes

Board renders: `ref/boards/render/r2-discover.png`,
`ref/boards/render/r2-discover-phone.png`, `ref/boards/render/r2-collection.png`.

## Interfaces And Dependencies

- New: `GET /api/v1/discover/search` (public), and for in-hub search
  `GET /api/v1/hubs/:id/search` (optional auth; policy-checked).
- Types in `packages/types`: `DiscoverSearchResult`, `HubSearchResult`.
- No new services or extensions beyond Postgres built-ins.
