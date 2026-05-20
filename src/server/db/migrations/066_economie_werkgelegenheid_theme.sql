-- Migration 066: Economie supercategory — Werkgelegenheid theme (cycle 7 of EPIC #159)
--
-- Third inhabitant of Economie (after Bedrijvigheid + Inkomen). Brings
-- the count of people who work in the gemeente alongside the count of
-- businesses and the household income — together those three tell a
-- coherent economic story.
--
-- Source: CBS 86276NED "Arbeidsdeelname; binding arbeidsmarkt; regio
-- (indeling 2025)". Filter to Measure 3000795_2 (Werkzame
-- beroepsbevolking) + Geslacht T001038 (Totaal).
-- CBS stores the count × 1000 — use valueScale to convert to actual
-- persons so compact-formatter renders 460000 → '460K' not '460'.

CREATE TABLE IF NOT EXISTS data_werkgelegenheid (
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

CREATE INDEX IF NOT EXISTS idx_werkgelegenheid_geo_year
  ON data_werkgelegenheid (geo_code, year);

INSERT INTO data_sources (
  key, name, supercategory, table_name, dimension_columns,
  value_column, unit, cbs_table_id, sync_config, sort_order,
  default_filters
)
VALUES (
  'werkgelegenheid',
  'Werkzame beroepsbevolking',
  'economie',
  'data_werkgelegenheid',
  ARRAY['geslacht'],
  'value',
  'personen',
  '86276NED',
  $${
    "filter": "Measure eq '3000795_2' and Geslacht eq 'T001038'",
    "cbsTable": "86276NED",
    "measureCode": "3000795_2",
    "targetTable": "data_werkgelegenheid",
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
  32,
  '{"geslacht": "totaal"}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO themes (slug, name, description, icon, supercategory, "order", config, kpi_config)
VALUES (
  'werkgelegenheid',
  'Werkgelegenheid',
  'Aantal werkzame personen in de beroepsbevolking per gemeente. Anchor-metric voor arbeidsmarkt-vraagstukken — naast Bedrijvigheid (werkgevers) en Inkomen (verdiensten) de derde pijler van het Economie-domein.',
  'TrendingUp',
  'economie',
  32,
  '{}'::jsonb,
  jsonb_build_array(
    jsonb_build_object(
      'label', 'Werkzame beroepsbevolking',
      'dataSource', 'werkgelegenheid',
      'dimension', 'geslacht',
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
    ('Werkzame beroepsbevolking — trend', 'line', 'werkgelegenheid', ARRAY[]::text[], 'gemeente',
     'Aantal werkzame personen (15-75 jaar, ten minste 1 uur per week betaald werk) per jaar voor de focal-gemeente. Bron: CBS Enquête Beroepsbevolking — driejaarsgemiddelden, dus traag-bewegend.',
     0, '{}'),
    ('Werkzame beroepsbevolking per gemeente', 'choropleth', 'werkgelegenheid', ARRAY[]::text[], 'gemeente',
     'Kaartweergave van het aantal werkzame personen per gemeente voor het gekozen jaar.',
     1, '{}')
) AS t(title, chart_type, data_source, dimensions, default_geo_level, description, tile_order, config)
WHERE th.slug = 'werkgelegenheid'
  AND NOT EXISTS (
    SELECT 1 FROM tiles t2
    WHERE t2.theme_id = th.id AND t2.title = t.title
  );
