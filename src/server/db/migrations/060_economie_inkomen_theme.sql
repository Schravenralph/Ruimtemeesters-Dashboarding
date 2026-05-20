-- Migration 060: Economie supercategory — Inkomen theme (cycle 3 of EPIC #159)
--
-- Second inhabitant of Economie. Backs the theme with CBS 86161NED
-- "Inkomen van huishoudens; huishoudenskenmerken, regio (indeling 2025)"
-- filtered to:
--   Measure                M000222  Gemiddeld gestandaardiseerd inkomen
--   KenmerkenVanHuishoudens 1050010 Alle particuliere huishoudens (totaal)
--   Populatie              1050010 Incl. studenten
--
-- The 'gestandaardiseerd' part is critical — it's corrected for household
-- size so a one-person Amsterdam household and a four-person Drenthe one
-- are comparable. Most policy work wants this number, not raw besteedbaar.

CREATE TABLE IF NOT EXISTS data_inkomen (
  id SERIAL PRIMARY KEY,
  geo_code VARCHAR(10) NOT NULL,
  year INT NOT NULL,
  huishouden_type VARCHAR(50) NOT NULL,
  populatie VARCHAR(50) NOT NULL,
  value NUMERIC(10,2),
  source VARCHAR(50) DEFAULT 'cbs_actuals',
  confidence_lower NUMERIC,
  confidence_upper NUMERIC,
  model_profile VARCHAR(50),
  forecast_vintage TIMESTAMP,
  UNIQUE (geo_code, year, huishouden_type, populatie, source)
);

CREATE INDEX IF NOT EXISTS idx_inkomen_geo_year
  ON data_inkomen (geo_code, year);

INSERT INTO data_sources (
  key, name, supercategory, table_name, dimension_columns,
  value_column, unit, cbs_table_id, sync_config, sort_order,
  default_filters
)
VALUES (
  'inkomen',
  'Inkomen huishoudens',
  'economie',
  'data_inkomen',
  ARRAY['huishouden_type', 'populatie'],
  'value',
  'EUR x 1000',
  '86161NED',
  $${
    "filter": "Measure eq 'M000222' and KenmerkenVanHuishoudens eq '1050010' and Populatie eq '1050010'",
    "cbsTable": "86161NED",
    "measureCode": "M000222",
    "targetTable": "data_inkomen",
    "regionDimension": "RegioS",
    "allowedLevels": ["gemeente", "land"],
    "dimensionMappings": [
      {
        "cbsDimension": "KenmerkenVanHuishoudens",
        "targetColumn": "huishouden_type",
        "valueMap": {
          "1050010": "totaal"
        }
      },
      {
        "cbsDimension": "Populatie",
        "targetColumn": "populatie",
        "valueMap": {
          "1050010": "incl_studenten"
        }
      }
    ]
  }$$::jsonb,
  31,
  '{"huishouden_type": "totaal", "populatie": "incl_studenten"}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO themes (slug, name, description, icon, supercategory, "order", config, kpi_config)
VALUES (
  'inkomen',
  'Inkomen',
  'Gemiddeld gestandaardiseerd inkomen van particuliere huishoudens per gemeente. Gecorrigeerd voor huishoudgrootte — direct vergelijkbaar tussen gemeenten.',
  'Banknote',
  'economie',
  31,
  '{}'::jsonb,
  jsonb_build_array(
    jsonb_build_object(
      'label', 'Gem. gestandaardiseerd inkomen',
      'dataSource', 'inkomen',
      'dimension', 'huishouden_type',
      'dimensionValue', 'totaal',
      'format', 'compact',
      'deltaDirection', 'higher-is-good'
    )
  )
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tiles (theme_id, title, chart_type, data_source, dimensions, default_geo_level, description, "order", config)
SELECT
  th.id, t.title, t.chart_type, t.data_source, t.dimensions::text[], t.default_geo_level, t.description, t.tile_order, t.config::jsonb
FROM themes th
CROSS JOIN (
  VALUES
    ('Inkomen — trend', 'line', 'inkomen', ARRAY[]::text[], 'gemeente',
     'Gemiddeld gestandaardiseerd inkomen per jaar (EUR × 1000). Vergelijkbaar tussen gemeenten ongeacht huishoudgrootte; benchmark tegen het landelijk gemiddelde via de cohort-referentie volgt zodra die op deze bron is aangesloten.',
     0, '{}'),
    ('Inkomen per gemeente', 'choropleth', 'inkomen', ARRAY[]::text[], 'gemeente',
     'Kaartweergave van het gemiddeld gestandaardiseerd inkomen per gemeente voor het gekozen jaar.',
     1, '{}')
) AS t(title, chart_type, data_source, dimensions, default_geo_level, description, tile_order, config)
WHERE th.slug = 'inkomen'
  AND NOT EXISTS (
    SELECT 1 FROM tiles t2
    WHERE t2.theme_id = th.id AND t2.title = t.title
  );
