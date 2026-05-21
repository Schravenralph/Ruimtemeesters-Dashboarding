-- Migration 068: add Werkloze beroepsbevolking to Werkgelegenheid theme (#159 follow-up)
--
-- Cycle 7 (PR #181) shipped Werkgelegenheid with only the Werkzame count.
-- Advisors looking at labour-market vulnerability ask the inverse too —
-- how many in the labour force are unemployed? Same CBS table 86276NED,
-- Measure 3000800_2. Pairing the two lets the eye estimate the
-- werkloosheidspercentage without us computing it.

CREATE TABLE IF NOT EXISTS data_werkloosheid (
  id SERIAL PRIMARY KEY,
  geo_code VARCHAR(10) NOT NULL,
  year INT NOT NULL,
  geslacht VARCHAR(20) NOT NULL,
  value INT,
  source VARCHAR(50) DEFAULT 'cbs_actuals',
  confidence_lower NUMERIC,
  confidence_upper NUMERIC,
  model_profile VARCHAR(50),
  forecast_vintage TIMESTAMP,
  UNIQUE (geo_code, year, geslacht, source)
);

CREATE INDEX IF NOT EXISTS idx_werkloosheid_geo_year
  ON data_werkloosheid (geo_code, year);

INSERT INTO data_sources (
  key, name, supercategory, table_name, dimension_columns,
  value_column, unit, cbs_table_id, sync_config, sort_order,
  default_filters
)
VALUES (
  'werkloosheid',
  'Werkloze beroepsbevolking',
  'economie',
  'data_werkloosheid',
  ARRAY['geslacht'],
  'value',
  'personen',
  '86276NED',
  $${
    "filter": "Measure eq '3000800_2' and Geslacht eq 'T001038'",
    "cbsTable": "86276NED",
    "measureCode": "3000800_2",
    "targetTable": "data_werkloosheid",
    "regionDimension": "RegioS",
    "allowedLevels": ["gemeente", "land"],
    "valueScale": 1000,
    "dimensionMappings": [
      {
        "cbsDimension": "Geslacht",
        "targetColumn": "geslacht",
        "valueMap": {
          "T001038": "totaal"
        }
      }
    ]
  }$$::jsonb,
  33,
  '{"geslacht": "totaal"}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Add a second KPI to the existing werkgelegenheid theme. Rising
-- unemployment is bad → 'higher-is-bad' (cycle 5 confirmed the enum is
-- higher-is-good|higher-is-bad|neutral; 'lower-is-good' is rejected).
UPDATE themes
   SET kpi_config = kpi_config || jsonb_build_array(
         jsonb_build_object(
           'label', 'Werkloze beroepsbevolking',
           'dataSource', 'werkloosheid',
           'dimension', 'geslacht',
           'dimensionValue', 'totaal',
           'format', 'compact',
           'deltaDirection', 'higher-is-bad'
         )
       )
 WHERE slug = 'werkgelegenheid'
   AND NOT EXISTS (
     SELECT 1 FROM jsonb_array_elements(kpi_config) AS k
     WHERE k->>'dataSource' = 'werkloosheid'
   );

-- Two new tiles on the Werkgelegenheid theme.
INSERT INTO tiles (theme_id, title, chart_type, data_source, dimensions, default_geo_level, description, "order", config)
SELECT
  th.id, t.title, t.chart_type, t.data_source, t.dimensions::text[], t.default_geo_level, t.description, t.tile_order, t.config::jsonb
FROM themes th
CROSS JOIN (
  VALUES
    ('Werkloze beroepsbevolking — trend', 'line', 'werkloosheid', ARRAY[]::text[], 'gemeente',
     'Aantal werkloze personen (15-75 jaar, beschikbaar voor werk en actief zoekend) per jaar. Bron: CBS Enquête Beroepsbevolking — driejaarsgemiddelden.',
     2, '{}'),
    ('Werkloze beroepsbevolking per gemeente', 'choropleth', 'werkloosheid', ARRAY[]::text[], 'gemeente',
     'Kaartweergave van het aantal werkloze personen per gemeente voor het gekozen jaar.',
     3, '{}')
) AS t(title, chart_type, data_source, dimensions, default_geo_level, description, tile_order, config)
WHERE th.slug = 'werkgelegenheid'
  AND NOT EXISTS (
    SELECT 1 FROM tiles t2
    WHERE t2.theme_id = th.id AND t2.title = t.title
  );
