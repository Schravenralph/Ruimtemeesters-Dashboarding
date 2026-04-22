-- Subsetted sync rules.
--
-- sync_schedules now carries an optional `subset_filters` JSONB that narrows
-- what a pull actually fetches. Composed into the OData $filter at run time
-- (yearRange pushes down to CBS; regionPrefixes / dimensionValues are
-- post-filtered on the server so we don't have to build arbitrarily deep
-- OData OR-chains).
--
-- Shape:
--   {
--     "yearRange":   { "min": 2020, "max": 2024 },          -- both optional
--     "regionPrefixes": ["GM", "PV", "NL"],                 -- match startswith
--     "dimensionValues": { "Geslacht": ["T001038"], ... }   -- whitelist per dim
--   }
--
-- Invariant: subset_filters are GLOBAL — they scope the single canonical pull
-- for the entire platform. Never add org_id here. See
-- `project_data_pull_vs_view` memory / PR #47 for the ruling.
--
-- Backwards compat: the existing `year_filter INTEGER` column is preserved.
-- When both are set, subset_filters.yearRange wins; year_filter is used only
-- when subset_filters is NULL or lacks a yearRange.

ALTER TABLE sync_schedules
  ADD COLUMN IF NOT EXISTS subset_filters JSONB;

COMMENT ON COLUMN sync_schedules.subset_filters IS
  'Global pull narrowing — yearRange, regionPrefixes, dimensionValues. See migration 023 header.';
