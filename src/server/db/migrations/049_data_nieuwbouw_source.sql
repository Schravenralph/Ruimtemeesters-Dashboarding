-- Migration 049: CBS Nieuwbouw per gemeente (86054NED) data source
--
-- Adds gemeente-level annual nieuwbouwwoningen counts to the Wonen
-- supercategory. Source: CBS 86054NED "Voorraad woningen; overige
-- toevoegingen en onttrekkingen (detail), regio" (yearly, 2020-2024).
-- 417 region codes including all gemeenten (GMxxxx).
--
-- v4 endpoint: https://datasets.cbs.nl/odata/v1/CBS/86054NED
-- Cadence: Perjaar. Demand-driven sync per ADR-006.
--
-- The table publishes many flow measures (Nieuwbouw, Sloop,
-- Transformatie, Woningsplitsing, etc). This source captures the
-- Nieuwbouw measure (M003003) only — net new physical dwellings.
-- Other flow measures (sloop, transformatie) are follow-up sources.
--
-- Earlier note: the originally-proposed 86084NED was the WRONG
-- table for gemeente drilldown — it only publishes at NL / landsdeel /
-- provincie / COROP levels (57 region codes, no GMxxxx rows). The
-- gemeente-level housing-flow table is 86054NED, confirmed by
-- /RegioSCodes probe (417 codes incl. GM0363 Amsterdam etc).
--
-- Spec: docs/superpowers/specs/forge-2026-05-14-005-cbs-nieuwbouw.md
-- EPIC: #141

CREATE TABLE IF NOT EXISTS data_nieuwbouw (
  id SERIAL PRIMARY KEY,
  geo_code VARCHAR(10) NOT NULL,
  year INT NOT NULL,
  value INT,
  source VARCHAR(50) DEFAULT 'cbs_actuals',
  confidence_lower NUMERIC,
  confidence_upper NUMERIC,
  model_profile VARCHAR(50),
  forecast_vintage TIMESTAMP,
  UNIQUE(geo_code, year, source)
);

CREATE INDEX IF NOT EXISTS idx_nieuwbouw_geo_year ON data_nieuwbouw (geo_code, year);

INSERT INTO data_sources (
  key, name, supercategory, table_name, dimension_columns,
  value_column, unit, cbs_table_id, sync_config, sort_order
)
VALUES (
  'nieuwbouw',
  'Nieuwbouw',
  'wonen',
  'data_nieuwbouw',
  ARRAY[]::text[],
  'value',
  'aantal',
  '86054NED',
  $${
    "filter": "Measure eq 'M003003'",
    "cbsTable": "86054NED",
    "measureCode": "M003003",
    "targetTable": "data_nieuwbouw",
    "regionDimension": "RegioS",
    "allowedLevels": ["gemeente", "land"],
    "dimensionMappings": []
  }$$::jsonb,
  10
)
ON CONFLICT (key) DO NOTHING;
