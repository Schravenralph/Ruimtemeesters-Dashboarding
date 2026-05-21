-- Migration 070: expand veiligheid sync to 5 top-level misdrijfsoorten (#161 follow-up)
--
-- Cycle 9 / PR #183 shipped Criminaliteit at the totaal level. Cycle 11
-- (spec 011) adds the natural next-click: breakdown by category so an
-- advisor can see whether the focal gemeente over-indexes on Vermogen,
-- Geweld, Verkeer, etc. Source: CBS 83648NED SoortMisdrijf — five top-
-- level CRI codes alongside the existing T001161 totaal.

-- Update sync_config to fetch all six categories. Filter widens to an
-- OR-clause over SoortMisdrijf; valueMap acquires entries per CRI code.
UPDATE data_sources
   SET sync_config = jsonb_set(
         jsonb_set(
           sync_config,
           '{filter}',
           '"Measure eq ''M004200_4'' and (SoortMisdrijf eq ''T001161'' or SoortMisdrijf eq ''CRI1000'' or SoortMisdrijf eq ''CRI2000'' or SoortMisdrijf eq ''CRI3000'' or SoortMisdrijf eq ''CRI4000'' or SoortMisdrijf eq ''CRI5000'')"'
         ),
         '{dimensionMappings}',
         jsonb_build_array(
           jsonb_build_object(
             'cbsDimension', 'SoortMisdrijf',
             'targetColumn', 'misdrijf_type',
             'valueMap', jsonb_build_object(
               'T001161', 'totaal',
               'CRI1000', 'vermogen',
               'CRI2000', 'vernieling',
               'CRI3000', 'gewelds',
               'CRI4000', 'verkeer',
               'CRI5000', 'drugs_wapens'
             )
           )
         )
       )
 WHERE key = 'veiligheid_misdrijven';

-- Wipe + let re-sync repopulate with all six soorten.
DELETE FROM data_veiligheid WHERE source = 'cbs_actuals';

-- Add the breakdown tile. Order 2 so it appears below the existing
-- choropleth (0) and trend (1).
INSERT INTO tiles (theme_id, title, chart_type, data_source, dimensions, default_geo_level, description, "order", config)
SELECT
  th.id, t.title, t.chart_type, t.data_source, t.dimensions::text[], t.default_geo_level, t.description, t.tile_order, t.config::jsonb
FROM themes th
CROSS JOIN (
  VALUES
    ('Misdrijven naar soort — focal gemeente', 'horizontal-bar', 'veiligheid_misdrijven', ARRAY['misdrijf_type']::text[], 'gemeente',
     'Verdeling van per 1000 inwoners geregistreerde misdrijven over vijf top-level categorieën (vermogen, vernieling/openbare orde, gewelds- en seksueel, verkeer, drugs/wapens) voor de focal-gemeente, naast de totaalbalk ter referentie.',
     2, '{}'::jsonb)
) AS t(title, chart_type, data_source, dimensions, default_geo_level, description, tile_order, config)
WHERE th.slug = 'criminaliteit'
  AND NOT EXISTS (
    SELECT 1 FROM tiles t2
    WHERE t2.theme_id = th.id AND t2.title = t.title
  );
