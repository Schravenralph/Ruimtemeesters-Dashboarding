-- Migration 053: default_filters on hernieuwbaar_nl so capaciteit_mw is the default metric
--
-- Follow-up to 052. The /api/data/timeseries handler, when given a
-- `dimension` query param (e.g. `dimension=energy_source`), forces all
-- OTHER dimension columns to value 'totaal' unless they appear in
-- data_sources.default_filters. data_hernieuwbaar.metric on the new
-- hernieuwbaar_nl rows is 'capaciteit_mw' (capacity in MW) — not
-- 'totaal' — so without this default the API silently returned 0 rows
-- for the new wind/biomass/biogas series even though they're in the
-- DB.
--
-- Declaring metric=capaciteit_mw as the default for this source tells
-- queryTimeSeries to pin metric to the right value when a caller asks
-- for energy_source variation but doesn't specify metric explicitly.
--
-- EPIC: #158

UPDATE data_sources
   SET default_filters = '{"metric": "capaciteit_mw"}'::jsonb
 WHERE key = 'hernieuwbaar_nl';
