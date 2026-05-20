-- Migration 064: Veiligheid supercategory scaffold + Criminaliteit theme
--
-- Fourth and final Stage-4 supercategory (alongside Wonen, Duurzaamheid,
-- Economie, Mobiliteit). Closes scaffold #90; opens cycle 1 of EPIC #161.
--
-- Anchor: CBS 83648NED "Geregistreerde criminaliteit; soort misdrijf,
-- regio" filtered to:
--   Measure        M004200_2  Totaal geregistreerde misdrijven (absoluut)
--   SoortMisdrijf  T001161    Misdrijven, totaal
-- Gemeente-level (464 gemeenten), 2010-2025.

-- 1. Supercategory ---------------------------------------------------------

INSERT INTO supercategories (key, name, description, icon, color, sort_order)
VALUES (
  'veiligheid',
  'Veiligheid',
  'Criminaliteit, openbare orde, sociale veiligheid — hoe veilig een gemeente is.',
  'Shield',
  '#dc2626',
  4
)
ON CONFLICT (key) DO NOTHING;

-- 2. Data table ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS data_veiligheid (
  id SERIAL PRIMARY KEY,
  geo_code VARCHAR(10) NOT NULL,
  year INT NOT NULL,
  misdrijf_type VARCHAR(50) NOT NULL,
  value INT,
  source VARCHAR(50) DEFAULT 'cbs_actuals',
  confidence_lower NUMERIC,
  confidence_upper NUMERIC,
  model_profile VARCHAR(50),
  forecast_vintage TIMESTAMP,
  UNIQUE (geo_code, year, misdrijf_type, source)
);

CREATE INDEX IF NOT EXISTS idx_veiligheid_geo_year
  ON data_veiligheid (geo_code, year);

-- 3. Data source -----------------------------------------------------------

INSERT INTO data_sources (
  key, name, supercategory, table_name, dimension_columns,
  value_column, unit, cbs_table_id, sync_config, sort_order,
  default_filters
)
VALUES (
  'veiligheid_misdrijven',
  'Geregistreerde criminaliteit',
  'veiligheid',
  'data_veiligheid',
  ARRAY['misdrijf_type'],
  'value',
  'aantal',
  '83648NED',
  $${
    "filter": "Measure eq 'M004200_2' and SoortMisdrijf eq 'T001161'",
    "cbsTable": "83648NED",
    "measureCode": "M004200_2",
    "targetTable": "data_veiligheid",
    "regionDimension": "RegioS",
    "allowedLevels": ["gemeente", "land"],
    "dimensionMappings": [
      {
        "cbsDimension": "SoortMisdrijf",
        "targetColumn": "misdrijf_type",
        "valueMap": {
          "T001161": "totaal"
        }
      }
    ]
  }$$::jsonb,
  50,
  '{"misdrijf_type": "totaal"}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- 4. Theme -----------------------------------------------------------------

INSERT INTO themes (slug, name, description, icon, supercategory, "order", config, kpi_config)
VALUES (
  'criminaliteit',
  'Criminaliteit',
  'Aantal door politie geregistreerde misdrijven per gemeente. Anchor-metric voor de veiligheidsdriehoek-gesprekken met OM en politie.',
  'Shield',
  'veiligheid',
  50,
  '{}'::jsonb,
  jsonb_build_array(
    jsonb_build_object(
      'label', 'Geregistreerde misdrijven',
      'dataSource', 'veiligheid_misdrijven',
      'dimension', 'misdrijf_type',
      'dimensionValue', 'totaal',
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
    ('Geregistreerde misdrijven — trend', 'line', 'veiligheid_misdrijven', ARRAY[]::text[], 'gemeente',
     'Totaal aantal door politie geregistreerde misdrijven per jaar voor de focal-gemeente. Bewegingen jaar-op-jaar kunnen zowel werkelijke ontwikkeling als veranderingen in aangiftebereidheid weerspiegelen — interpreteer in context.',
     0, '{}'),
    ('Misdrijven per gemeente', 'choropleth', 'veiligheid_misdrijven', ARRAY[]::text[], 'gemeente',
     'Kaartweergave van het aantal geregistreerde misdrijven per gemeente voor het gekozen jaar. Absolute aantallen — interpreteer naast inwoneraantal voor een eerlijke vergelijking.',
     1, '{}')
) AS t(title, chart_type, data_source, dimensions, default_geo_level, description, tile_order, config)
WHERE th.slug = 'criminaliteit'
  AND NOT EXISTS (
    SELECT 1 FROM tiles t2
    WHERE t2.theme_id = th.id AND t2.title = t.title
  );
