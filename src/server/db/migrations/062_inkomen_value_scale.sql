-- Migration 062: scale inkomen values to actual EUR (#177)
--
-- CBS 86161NED publishes income as 'EUR × 1000' — the value 44 means
-- €44K. Stored that way verbatim in data_inkomen.value. The compact
-- formatter renders 44 → "44" (no K below 1000), so the KPI looks
-- like €44 and the y-axis shows 24/30/45 instead of 24K/30K/45K.
--
-- Fix at the data layer: scale stored values × 1000 and change the
-- source unit to 'EUR'. Compact then renders 44,000 → "44K" correctly.
-- The new sync_config.valueScale (added in cbs-generic-sync) ensures
-- future syncs apply the scaling too.

UPDATE data_inkomen
   SET value = value * 1000
 WHERE value < 1000;  -- idempotent guard: don't re-scale if migration re-runs on a previously-scaled DB

UPDATE data_sources
   SET unit = 'EUR',
       sync_config = sync_config || '{"valueScale": 1000}'::jsonb
 WHERE key = 'inkomen';

-- Tile descriptions referenced 'EUR × 1000' — now stale (values are in
-- actual EUR). Replace with a clean 'EUR' wording.
UPDATE tiles
   SET description = REPLACE(description, ' (EUR × 1000)', '')
 WHERE data_source = 'inkomen'
   AND description LIKE '%EUR × 1000%';
