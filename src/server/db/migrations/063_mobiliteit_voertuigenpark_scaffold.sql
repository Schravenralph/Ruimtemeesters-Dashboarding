-- Migration 063: Mobiliteit supercategory scaffold + Voertuigenpark theme
--
-- First inhabitant of Mobiliteit (PRODUCT-VISION Stage 4). Closes
-- scaffold issue #89; opens cycle 1 of EPIC #160.
--
-- Anchor: CBS 85236NED "Motorvoertuigen actief; voertuigtype,
-- postcode, regio, 1 januari" filtered to Measure A018943
-- (Personenauto's). Gemeente-level (360 gemeenten), 2019-2023.
-- Postcode-level breakdown is also in the table; the
-- `allowedLevels: ["gemeente", "land"]` filter keeps us at gemeente
-- for this first cut.

-- 1. Supercategory ---------------------------------------------------------

INSERT INTO supercategories (key, name, description, icon, color, sort_order)
VALUES (
  'mobiliteit',
  'Mobiliteit',
  'Voertuigenpark, verkeer, bereikbaarheid — hoe een gemeente zich verplaatst.',
  'Car',
  '#0891b2',
  3
)
ON CONFLICT (key) DO NOTHING;

-- 2. Voertuigen data table -------------------------------------------------

CREATE TABLE IF NOT EXISTS data_voertuigen (
  id SERIAL PRIMARY KEY,
  geo_code VARCHAR(10) NOT NULL,
  year INT NOT NULL,
  voertuig_type VARCHAR(50) NOT NULL,
  value INT,
  source VARCHAR(50) DEFAULT 'cbs_actuals',
  confidence_lower NUMERIC,
  confidence_upper NUMERIC,
  model_profile VARCHAR(50),
  forecast_vintage TIMESTAMP,
  UNIQUE (geo_code, year, voertuig_type, source)
);

CREATE INDEX IF NOT EXISTS idx_voertuigen_geo_year
  ON data_voertuigen (geo_code, year);

-- 3. Data source registration ----------------------------------------------

INSERT INTO data_sources (
  key, name, supercategory, table_name, dimension_columns,
  value_column, unit, cbs_table_id, sync_config, sort_order,
  default_filters
)
VALUES (
  'voertuigen',
  'Personenauto''s (motorvoertuigenpark)',
  'mobiliteit',
  'data_voertuigen',
  ARRAY['voertuig_type'],
  'value',
  'aantal',
  '85236NED',
  $${
    "filter": "Measure eq 'A018943'",
    "cbsTable": "85236NED",
    "measureCode": "A018943",
    "targetTable": "data_voertuigen",
    "regionDimension": "RegioS",
    "allowedLevels": ["gemeente", "land"],
    "dimensionMappings": [],
    "constantColumns": {
      "voertuig_type": "personenauto"
    }
  }$$::jsonb,
  40,
  '{"voertuig_type": "personenauto"}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- 4. Theme -----------------------------------------------------------------

INSERT INTO themes (slug, name, description, icon, supercategory, "order", config, kpi_config)
VALUES (
  'voertuigenpark',
  'Voertuigenpark',
  'Het aantal actieve personenauto''s per gemeente. Anchor-metric voor het Mobiliteit-domein — relevant voor parkeerdruk, autoluw-beleid en laadinfra-planning.',
  'Car',
  'mobiliteit',
  40,
  '{}'::jsonb,
  jsonb_build_array(
    jsonb_build_object(
      'label', 'Personenauto''s',
      'dataSource', 'voertuigen',
      'dimension', 'voertuig_type',
      'dimensionValue', 'personenauto',
      'format', 'compact',
      'deltaDirection', 'higher-is-bad'
    )
  )
)
ON CONFLICT (slug) DO NOTHING;

-- 5. Tiles -----------------------------------------------------------------

INSERT INTO tiles (theme_id, title, chart_type, data_source, dimensions, default_geo_level, description, "order", config)
SELECT
  th.id, t.title, t.chart_type, t.data_source, t.dimensions::text[], t.default_geo_level, t.description, t.tile_order, t.config::jsonb
FROM themes th
CROSS JOIN (
  VALUES
    ('Personenauto''s — trend', 'line', 'voertuigen', ARRAY[]::text[], 'gemeente',
     'Aantal actieve personenauto''s per jaar (peildatum 1 januari) op het geselecteerde geo-niveau. Trend toont parkeerdruk-ontwikkeling.',
     0, '{}'),
    ('Personenauto''s per gemeente', 'choropleth', 'voertuigen', ARRAY[]::text[], 'gemeente',
     'Kaartweergave van het aantal personenauto''s per gemeente voor het gekozen jaar.',
     1, '{}')
) AS t(title, chart_type, data_source, dimensions, default_geo_level, description, tile_order, config)
WHERE th.slug = 'voertuigenpark'
  AND NOT EXISTS (
    SELECT 1 FROM tiles t2
    WHERE t2.theme_id = th.id AND t2.title = t.title
  );
