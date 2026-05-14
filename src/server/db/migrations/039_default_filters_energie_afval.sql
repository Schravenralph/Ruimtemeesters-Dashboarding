-- data_energie.sector and data_afval.metric have no 'totaal' value,
-- which trips the controller's "filter other dims to totaal" default
-- and returns 0 rows for any tile that doesn't explicitly pin both
-- dims. Until we either (a) ship a smarter aggregation fallback or
-- (b) re-sync the data with synthetic totaal rows, the cleanest
-- unblocker is to set a sensible default in the registry.
--
-- Choices:
--   energie.sector = 'woningen' — residential energy is the most-asked
--     angle for gemeente-level energy dashboards. The 'verwarming'
--     sector remains available via explicit query param.
--   afval.metric  = 'kg_per_inwoner' — per-inwoner is the metric every
--     gemeente reports against; the duplicate 'per_inwoner_kg' value
--     is a data-quality artefact (CBS column naming inconsistency)
--     and is left as-is.

UPDATE data_sources
SET default_filters = '{"sector": "woningen"}'::jsonb
WHERE key = 'energie';

UPDATE data_sources
SET default_filters = '{"metric": "kg_per_inwoner"}'::jsonb
WHERE key = 'afval';
