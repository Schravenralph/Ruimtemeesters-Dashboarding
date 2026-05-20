-- Migration 052: CBS 82610NED — Hernieuwbare elektriciteit; productie en vermogen (NL totaal)
--
-- First step of EPIC #158 (theme deepening — hernieuwbare-energie). The
-- existing `hernieuwbaar` data source is bound to CBS 84518NED, which is
-- gemeente-level but **zonne-only by design** ("Zonnestroom; vermogen
-- bedrijven en woningen, regio"). The Hernieuwbare-energie theme cannot
-- tell the wind / biomassa / waterkracht / biogas story because CBS
-- doesn't publish those at gemeente level — only national, provincie or
-- RES-regio aggregates exist.
--
-- This adds CBS 82610NED at **national level only** so the theme has
-- real wind/biomassa/biogas/water rows to render. Provincie/RES-regio
-- (e.g. 85004NED) and the eventual gemeente-level estimates from
-- Klimaatmonitor are tracked separately in #158's follow-ups.
--
-- 82610NED dimensions:
--   BronTechniek: T001028 totaal, E006587 waterkracht, E006588 wind tot.,
--                 E006637 wind op land, E006638 wind op zee,
--                 E006590 zonnestroom, E006566 biomassa tot.,
--                 E006583 biogas tot.
--   Perioden: 1990-2025 (yearly)
--   No region dimension — every row is NL.
--
-- Metric mapping mirrors data_hernieuwbaar's existing metric column
-- ('capaciteit_mw' for installed capacity, 'totaal' for gross
-- production). 'capaciteit_mw' is the primary measure here because
-- it's what the existing zonne tiles also use, so cross-source
-- aggregation stays apples-to-apples.
--
-- Reuses data_hernieuwbaar — no new table. UNIQUE constraint
-- (geo_code, year, energy_source, metric, source) means the new NL
-- rows can't collide with the existing gemeente-level zonne rows.
--
-- EPIC: #158
-- v4 endpoint: https://datasets.cbs.nl/odata/v1/CBS/82610NED

INSERT INTO data_sources (
  key, name, supercategory, table_name, dimension_columns,
  value_column, unit, cbs_table_id, sync_config, sort_order
)
VALUES (
  'hernieuwbaar_nl',
  'Hernieuwbare elektriciteit (NL)',
  'duurzaamheid',
  'data_hernieuwbaar',
  ARRAY['energy_source', 'metric'],
  'value',
  'MW',
  '82610NED',
  $${
    "filter": "",
    "cbsTable": "82610NED",
    "measureCode": "M002163",
    "targetTable": "data_hernieuwbaar",
    "regionDimension": "NONE",
    "allowedLevels": ["land"],
    "dimensionMappings": [
      {
        "cbsDimension": "BronTechniek",
        "targetColumn": "energy_source",
        "valueMap": {
          "T001028": "totaal_hernieuwbaar",
          "E006587": "waterkracht",
          "E006588": "wind",
          "E006637": "wind_op_land",
          "E006638": "wind_op_zee",
          "E006590": "zonnestroom",
          "E006566": "biomassa",
          "E006583": "biogas"
        }
      }
    ],
    "constantColumns": {
      "metric": "capaciteit_mw"
    }
  }$$::jsonb,
  21
)
ON CONFLICT (key) DO NOTHING;
