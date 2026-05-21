-- Migration 067: switch veiligheid to per-1000-inwoners rate (#161 follow-up)
--
-- Cycle 6 (PR #180) shipped Criminaliteit with absolute crime counts.
-- The choropleth showed Amsterdam darkest because it's largest, not
-- because crime concentrates there. Switching the source to CBS
-- 83648NED Measure M004200_4 (Geregistreerde misdrijven per 1000 inw.)
-- makes the gradient meaningful: where IS crime above the per-capita
-- average?
--
-- Same dimensions, same table — only the measure code changes. Re-sync
-- repopulates data_veiligheid.value with the rate.

-- Wipe existing rows + widen value column. The per-1000 rate is a
-- decimal (72.4 misdrijven per 1000 inw.) — INT would truncate. ALTER
-- before re-sync so the inserts don't reject.
DELETE FROM data_veiligheid WHERE source = 'cbs_actuals';
ALTER TABLE data_veiligheid ALTER COLUMN value TYPE NUMERIC(10, 2);

UPDATE data_sources
   SET sync_config = jsonb_set(
         jsonb_set(
           sync_config,
           '{measureCode}',
           '"M004200_4"'
         ),
         '{filter}',
         '"Measure eq ''M004200_4'' and SoortMisdrijf eq ''T001161''"'
       ),
       unit = 'per 1000 inw.'
 WHERE key = 'veiligheid_misdrijven';
