-- Migration 065: fix KPI delta-direction on voertuigenpark + criminaliteit
--
-- Bugbot finding on #180: cycles 5 + 6 seeded `deltaDirection` as
-- 'lower-is-good'. The KpiStrip / NumberDisplay code only recognises
-- 'higher-is-good' | 'higher-is-bad' | 'neutral'. For both
-- personenauto-count and registered crimes the correct semantics is
-- 'higher-is-bad' — more is worse. With the unknown value, the vs-cohort
-- and vs-landelijk chips stayed red regardless of direction.
--
-- 063/064 patched in-place for fresh DB applies; this migration repairs
-- already-applied DBs.

UPDATE themes
   SET kpi_config = REPLACE(kpi_config::text, '"lower-is-good"', '"higher-is-bad"')::jsonb
 WHERE slug IN ('voertuigenpark', 'criminaliteit')
   AND kpi_config::text LIKE '%lower-is-good%';
