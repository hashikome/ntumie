-- Discover search (docs/exec-plans/active/discover-search.md): Postgres
-- full-text search ranked with ts_rank_cd, and pg_trgm for typos. SQL-only
-- objects (like app_uuid_v7): review any generated diff so it never drops them.

-- Trusted extension (Postgres 13+): the database owner can create it.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- The weighted search text, in one place so indexes and queries agree. The
-- 'simple' configuration does no stemming: content is multilingual.
CREATE FUNCTION public.collection_search_vector(title text, description text)
RETURNS tsvector LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT setweight(to_tsvector('simple', coalesce(title, '')), 'A')
      || setweight(to_tsvector('simple', coalesce(description, '')), 'B')
$$;

CREATE FUNCTION public.hub_search_vector(name text, handle text, description text)
RETURNS tsvector LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT setweight(to_tsvector('simple', coalesce(name, '')), 'A')
      || setweight(to_tsvector('simple', replace(coalesce(handle, ''), '-', ' ')), 'A')
      || setweight(to_tsvector('simple', coalesce(description, '')), 'B')
$$;

-- Only published collections are ever searched by visitors.
CREATE INDEX idx_collections_search ON collections
  USING gin (public.collection_search_vector(title, description)) WHERE published;
CREATE INDEX idx_collections_title_trgm ON collections
  USING gin (lower(title) gin_trgm_ops) WHERE published;

CREATE INDEX idx_hubs_search ON hubs
  USING gin (public.hub_search_vector(name, handle, description));
CREATE INDEX idx_hubs_name_trgm ON hubs USING gin (lower(name) gin_trgm_ops);

-- Tag prefix matches ("compo" finds the tag "compost").
CREATE INDEX idx_tags_name_pattern ON tags (lower(name) text_pattern_ops);
