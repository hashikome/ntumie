# ADR-0074: Search runs in Postgres

Status: Accepted
Date: 2026-11-27

## Context

Discover and the reader's "Search this hub" search titles, descriptions, tags, sections and link
titles: a small corpus, in many languages (English and Swahili already appear), where a newly
published or unpublished collection must appear or vanish at once, and where in-hub results include
private collections that only the policy service may decide on.

## Decision

- Postgres full-text search with the `simple` configuration (no stemming) and prefix matching, so
  "compo" finds "compost" in any language. Typos are caught by `pg_trgm` word similarity on titles
  and hub names ("compst" finds "compost").
- Results rank by `ts_rank_cd` over weighted text (title A, description B, tags C), plus a smaller
  similarity term for near-misses, then saves, then recency.
- All search sits behind `SearchService` (`apps/api/src/modules/search/`) with its own result
  types; clients depend on the API contract only.
- In-hub search asks the policy service which of the hub's collections the viewer can read, then
  searches only those. Private content never reaches results, counts or highlights it may not.
- Search text stays out of logs (route templates only), audit records and analytics: addresses
  sent to analytics keep their path and only the `tab` and `tag` parameters.
- Move to a dedicated engine (Meilisearch or Typesense, never Elasticsearch or OpenSearch for this
  corpus) only when p95 latency stays above about 100 ms after index tuning, when ranking or typo
  tolerance needs more than weights and trigrams, or for faceting across millions of rows. An
  external engine never holds private content: in-hub search stays in Postgres either way.

## Consequences

No new service to run, and results are as fresh as the transaction that changed them. Ranking is
tuned with weights, not learned. Moving engines later changes one module. The index lives in
migration SQL (`collection_search_vector`, `hub_search_vector`, expression and trigram indexes),
which a generated migration diff must never drop.
