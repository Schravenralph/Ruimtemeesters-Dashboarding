-- Migration 056: Economie supercategory scaffold + Bedrijvigheid theme
--
-- First inhabitant of the Economie supercategory (PRODUCT-VISION Stage 4).
-- Closes scaffold issue #88; opens cycle 1 of EPIC #159.
--
-- Source: CBS 81575NED "Vestigingen van bedrijven; bedrijfstak, gemeente"
-- 266K records (2007-2026), gemeente-level, single measure (M000200 =
-- Vestigingen count). Pre-filtered server-side to T001081 (alle SBI
-- totaal) so the initial sync lands a manageable ~7K rows; sub-sector
-- breakdowns are future cycles.

-- 1. Supercategory ---------------------------------------------------------

INSERT INTO supercategories (key, name, description, icon, color, sort_order)
VALUES (
  'economie',
  'Economie',
  'Bedrijvigheid, werkgelegenheid, inkomen — het economische landschap van een gemeente.',
  'briefcase',
  '#a16207',
  2
)
ON CONFLICT (key) DO NOTHING;

-- 2. Vestigingen data table ------------------------------------------------

CREATE TABLE IF NOT EXISTS data_vestigingen (
  id SERIAL PRIMARY KEY,
  geo_code VARCHAR(10) NOT NULL,
  year INT NOT NULL,
  sbi VARCHAR(50) NOT NULL,
  value INT,
  source VARCHAR(50) DEFAULT 'cbs_actuals',
  confidence_lower NUMERIC,
  confidence_upper NUMERIC,
  model_profile VARCHAR(50),
  forecast_vintage TIMESTAMP,
  UNIQUE (geo_code, year, sbi, source)
);

CREATE INDEX IF NOT EXISTS idx_vestigingen_geo_year
  ON data_vestigingen (geo_code, year);

-- 3. Data source registration ----------------------------------------------

INSERT INTO data_sources (
  key, name, supercategory, table_name, dimension_columns,
  value_column, unit, cbs_table_id, sync_config, sort_order,
  default_filters
)
VALUES (
  'vestigingen',
  'Vestigingen van bedrijven',
  'economie',
  'data_vestigingen',
  ARRAY['sbi'],
  'value',
  'aantal',
  '81575NED',
  $${
    "filter": "Measure eq 'M000200' and BedrijfstakkenBranchesSBI2008 eq 'T001081'",
    "cbsTable": "81575NED",
    "measureCode": "M000200",
    "targetTable": "data_vestigingen",
    "regionDimension": "RegioS",
    "allowedLevels": ["gemeente", "land"],
    "dimensionMappings": [
      {
        "cbsDimension": "BedrijfstakkenBranchesSBI2008",
        "targetColumn": "sbi",
        "valueMap": {
          "T001081": "totaal"
        }
      }
    ]
  }$$::jsonb,
  30,
  '{"sbi": "totaal"}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- 4. Theme ----------------------------------------------------------------

INSERT INTO themes (slug, name, description, icon, supercategory, "order", config, kpi_config)
VALUES (
  'bedrijvigheid',
  'Bedrijvigheid',
  'Aantal vestigingen van bedrijven per gemeente over tijd. Anchor-metric voor het Economie-domein.',
  'Briefcase',
  'economie',
  30,
  '{}'::jsonb,
  jsonb_build_array(
    jsonb_build_object(
      'label', 'Totaal vestigingen',
      'dataSource', 'vestigingen',
      'dimension', 'sbi',
      'dimensionValue', 'totaal',
      'format', 'compact',
      'deltaDirection', 'higher-is-good'
    )
  )
)
ON CONFLICT (slug) DO NOTHING;

-- 5. Tiles ----------------------------------------------------------------

INSERT INTO tiles (theme_id, title, chart_type, data_source, dimensions, default_geo_level, description, "order", config)
SELECT
  th.id, t.title, t.chart_type, t.data_source, t.dimensions::text[], t.default_geo_level, t.description, t.tile_order, t.config::jsonb
FROM themes th
CROSS JOIN (
  VALUES
    ('Vestigingen — trend', 'line', 'vestigingen', ARRAY[]::text[], 'gemeente',
     'Aantal vestigingen van bedrijven per jaar op het geselecteerde geo-niveau. Eén lijn voor de focal-gemeente; vergelijking met cohort/provincie/landelijk volgt zodra de reference-pipeline aangesloten is.',
     0, '{}'),
    ('Vestigingen per gemeente', 'choropleth', 'vestigingen', ARRAY[]::text[], 'gemeente',
     'Kaartweergave van het aantal vestigingen per gemeente voor het geselecteerde jaar.',
     1, '{}')
) AS t(title, chart_type, data_source, dimensions, default_geo_level, description, tile_order, config)
WHERE th.slug = 'bedrijvigheid'
  AND NOT EXISTS (
    SELECT 1 FROM tiles t2
    WHERE t2.theme_id = th.id AND t2.title = t.title
  );
