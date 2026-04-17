-- Full-text search over CBS catalog using tsvector + GIN index.
-- Postgres 16 ts_rank_cd gives BM25-like ranking (cover-density variant).
-- Dutch text config for stemming ("woningen" → "woning").

CREATE EXTENSION IF NOT EXISTS unaccent;

-- Store the derived tsvector so we can GIN-index it and avoid recomputing per query.
ALTER TABLE cbs_catalog
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Weighted composite: title (A) > short_title (B) > summary (C) > identifier+themes (D).
-- Weights matter for ts_rank_cd — an identifier match should not outrank a title match.
CREATE OR REPLACE FUNCTION cbs_catalog_update_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
      setweight(to_tsvector('dutch', unaccent(coalesce(NEW.title, ''))), 'A')
    || setweight(to_tsvector('dutch', unaccent(coalesce(NEW.short_title, ''))), 'B')
    || setweight(to_tsvector('dutch', unaccent(coalesce(NEW.summary, ''))), 'C')
    || setweight(to_tsvector('simple', coalesce(NEW.identifier, '')), 'D')
    || setweight(to_tsvector('dutch', unaccent(array_to_string(coalesce(NEW.themes, '{}'::text[]), ' '))), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cbs_catalog_search_vector ON cbs_catalog;
CREATE TRIGGER trg_cbs_catalog_search_vector
  BEFORE INSERT OR UPDATE OF title, short_title, summary, identifier, themes
  ON cbs_catalog
  FOR EACH ROW EXECUTE FUNCTION cbs_catalog_update_search_vector();

-- Backfill existing rows (touch each so the trigger fires via UPDATE).
UPDATE cbs_catalog SET title = title;

CREATE INDEX IF NOT EXISTS idx_cbs_catalog_search_vector ON cbs_catalog USING gin(search_vector);

-- Trigram index for prefix/typo-tolerant substring search on title+identifier.
-- Works alongside FTS for the "user is still typing" case where websearch_to_tsquery
-- can't match partial tokens well.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_cbs_catalog_title_trgm ON cbs_catalog USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cbs_catalog_identifier_trgm ON cbs_catalog USING gin(identifier gin_trgm_ops);
