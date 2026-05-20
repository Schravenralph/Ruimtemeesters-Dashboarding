-- Migration 059: correct afval default_filters to per_inwoner_kg (#157 follow-up)
--
-- While verifying the new tiles from 058, the existing afval source's
-- `default_filters` (`metric=kg_per_inwoner`) turned out to surface the
-- wrong values: those rows hold absolute totals (~214K for Amsterdam
-- restafval 2024), not per-capita. The `per_inwoner_kg` metric — despite
-- the awkward column name — holds the realistic per-capita values (~230
-- kg/inwoner) AND has more waste_type variety
-- (glas/papier/textiel/kunststof/grof_restafval, not just
-- gft/restafval/totaal). Switching the default makes both old and new
-- tiles meaningful.
--
-- Renaming the metric values themselves to consistent naming (e.g.
-- 'per_capita_kg' for both) is a larger data-cleanup task — out of
-- scope for this cycle.

UPDATE data_sources
   SET default_filters = '{"metric": "per_inwoner_kg"}'::jsonb
 WHERE key = 'afval';
