-- Migration 058: expand afval-circulair theme from 2 to 5 tiles (#157)
--
-- The afval-circulair theme has rich data (7 waste_type values across
-- ~12K rows each, 1998-2030) but only 2 tiles. Adds 3 tiles that
-- surface the data already in data_afval:
--
--  - Restafval per inwoner — line trend pinned to waste_type=restafval
--  - Afvalstromen vergeleken — multi-line, one line per waste_type
--  - Restafval per gemeente — choropleth for the latest year
--
-- Uses the per-tile config.dimensionValue plumbing so the line/chropleth
-- tiles pin to a single waste_type server-side. The multi-line tile
-- leaves dimensionValue unset → relies on the per-row dimensionValue
-- propagation from #173 to draw one line per waste type.
--
-- EPIC: #157

INSERT INTO tiles (theme_id, title, chart_type, data_source, dimensions, default_geo_level, description, "order", config)
SELECT
  th.id, t.title, t.chart_type, t.data_source, t.dimensions::text[], t.default_geo_level, t.description, t.tile_order, t.config::jsonb
FROM themes th
CROSS JOIN (
  VALUES
    ('Restafval per inwoner', 'line', 'afval', ARRAY['waste_type'], 'gemeente',
     'Kilo restafval per inwoner per jaar voor de focal-gemeente. Lager = beter; benchmark tegen het landelijk gemiddelde via de cohort-referentie zodra die op deze bron is aangesloten.',
     2, '{"dimensionValue": "restafval"}'),
    ('Afvalstromen vergeleken', 'line', 'afval', ARRAY['waste_type'], 'gemeente',
     'Alle afvalstromen (restafval, gft, glas, papier, textiel, kunststof, grof_restafval) per jaar, één lijn per stroom. Toont de samenstelling van het huishoudelijk afval over tijd.',
     3, '{}'),
    ('Restafval per gemeente', 'choropleth', 'afval', ARRAY['waste_type'], 'gemeente',
     'Kaartweergave van restafval per inwoner over Nederland voor het gekozen jaar. Hoe lichter, hoe minder restafval — proxy voor afvalscheidingsbeleid.',
     4, '{"dimensionValue": "restafval"}')
) AS t(title, chart_type, data_source, dimensions, default_geo_level, description, tile_order, config)
WHERE th.slug = 'afval-circulair'
  AND NOT EXISTS (
    SELECT 1 FROM tiles t2
    WHERE t2.theme_id = th.id AND t2.title = t.title
  );
