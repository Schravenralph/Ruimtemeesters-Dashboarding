-- Migration 050: CBS Gemiddelde WOZ-waarde van woningen (85036NED) data source
--
-- Adds gemeente-level mean WOZ value per Eigendom split to the Wonen
-- supercategory. Source: CBS 85036NED "Gemiddelde WOZ-waarde van
-- woningen; eigendom, regio" (yearly, 2019-2025). 417 region codes
-- including all gemeenten (GMxxxx).
--
-- v4 endpoint: https://datasets.cbs.nl/odata/v1/CBS/85036NED
-- Cadence: Perjaar. Demand-driven sync per ADR-006.
--
-- Single measure M003039 (Gemiddelde WOZ-waarde) in 1000 euro.
-- Eigendom dimension has 4 codes:
--   T001132   Totaal
--   1014800   Koopwoningen
--   A047047   Huurwoning in bezit woningcorporatie
--   A047048   Eigendom overige verhuurders
--
-- Storage: ~7 years × 417 regions × 4 eigendom = ~12k rows. Comfortably
-- under the 10 GB rule (project_bulk_storage_to_mnt) — root-disk PG.
--
-- Spec: docs/superpowers/specs/forge-2026-05-14-006-cbs-woz.md
-- EPIC: #141

CREATE TABLE IF NOT EXISTS data_woz (
  id SERIAL PRIMARY KEY,
  geo_code VARCHAR(10) NOT NULL,
  year INT NOT NULL,
  eigendom_type VARCHAR(50) NOT NULL,
  value NUMERIC(12, 2),
  source VARCHAR(50) DEFAULT 'cbs_actuals',
  confidence_lower NUMERIC,
  confidence_upper NUMERIC,
  model_profile VARCHAR(50),
  forecast_vintage TIMESTAMP,
  UNIQUE(geo_code, year, eigendom_type, source)
);

CREATE INDEX IF NOT EXISTS idx_woz_geo_year ON data_woz (geo_code, year);

INSERT INTO data_sources (
  key, name, supercategory, table_name, dimension_columns,
  value_column, unit, cbs_table_id, sync_config, sort_order
)
VALUES (
  'woz',
  'WOZ-waarde',
  'wonen',
  'data_woz',
  ARRAY['eigendom_type'],
  'value',
  '1000 euro',
  '85036NED',
  $${
    "filter": "Measure eq 'M003039'",
    "cbsTable": "85036NED",
    "measureCode": "M003039",
    "targetTable": "data_woz",
    "regionDimension": "RegioS",
    "allowedLevels": ["gemeente", "land"],
    "dimensionMappings": [
      {
        "cbsDimension": "Eigendom",
        "targetColumn": "eigendom_type",
        "valueMap": {
          "T001132": "totaal",
          "1014800": "koop",
          "A047047": "huur_corporatie",
          "A047048": "huur_overig"
        }
      }
    ]
  }$$::jsonb,
  11
)
ON CONFLICT (key) DO NOTHING;
