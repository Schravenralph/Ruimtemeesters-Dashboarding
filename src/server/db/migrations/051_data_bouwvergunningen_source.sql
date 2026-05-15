-- Migration 051: CBS Bouwvergunningen woonruimten (83671NED) data source
--
-- Adds gemeente-level annual bouwvergunningen-aan-woonruimten counts to
-- the Wonen supercategory, split by Eigendom (koop / huur) and
-- Opdrachtgever (corporatie/overheid / markt / particulier). Source:
-- CBS 83671NED "Bouwvergunningen woonruimten; type, opdrachtgever,
-- eigendom, gemeente" (quarterly 2012-2025, aggregated to year).
--
-- 441 region codes including all gemeenten (GMxxxx).
-- v4 endpoint: https://datasets.cbs.nl/odata/v1/CBS/83671NED
-- Cadence: Perkwartaal at CBS → aggregated to Perjaar in sync (sum of
-- 4 quarters). Yearly is the right grain for cross-source comparison
-- with nieuwbouw (86054NED, yearly) and the realisatieratio narrative.
--
-- Measure: A007233 (Woningen, aantal) — permitted dwellings count.
-- Other measures (Bouwkosten, Wooneenheden, Recreatiewoningen) are
-- deferred to follow-ups if demand surfaces.
--
-- Earlier note: the 83451NED in forge-report-2026-05-14-late-afternoon
-- was wrong (not a valid CBS table). 81955NED (also referenced) is the
-- woningvoorraad table, not permits. The correct woonruimten-permits
-- table is 83671NED, confirmed by catalog search.
--
-- This migration depends on parseCbsPeriod handling KW codes (added in
-- the same PR) so quarterly observations aggregate correctly.
--
-- Spec: docs/superpowers/specs/forge-2026-05-14-007-cbs-bouwvergunningen-woonruimten.md
-- EPIC: #141

CREATE TABLE IF NOT EXISTS data_bouwvergunningen_woonruimten (
  id SERIAL PRIMARY KEY,
  geo_code VARCHAR(10) NOT NULL,
  year INT NOT NULL,
  eigendom_type VARCHAR(50) NOT NULL,
  opdrachtgever_type VARCHAR(50) NOT NULL,
  value INT,
  source VARCHAR(50) DEFAULT 'cbs_actuals',
  confidence_lower NUMERIC,
  confidence_upper NUMERIC,
  model_profile VARCHAR(50),
  forecast_vintage TIMESTAMP,
  UNIQUE(geo_code, year, eigendom_type, opdrachtgever_type, source)
);

CREATE INDEX IF NOT EXISTS idx_bouwverg_geo_year
  ON data_bouwvergunningen_woonruimten (geo_code, year);

INSERT INTO data_sources (
  key, name, supercategory, table_name, dimension_columns,
  value_column, unit, cbs_table_id, sync_config, sort_order
)
VALUES (
  'bouwvergunningen_woonruimten',
  'Bouwvergunningen woonruimten',
  'wonen',
  'data_bouwvergunningen_woonruimten',
  ARRAY['eigendom_type', 'opdrachtgever_type'],
  'value',
  'aantal',
  '83671NED',
  $${
    "filter": "Measure eq 'A007233'",
    "cbsTable": "83671NED",
    "measureCode": "A007233",
    "targetTable": "data_bouwvergunningen_woonruimten",
    "regionDimension": "RegioS",
    "allowedLevels": ["gemeente", "land"],
    "dimensionMappings": [
      {
        "cbsDimension": "Eigendom",
        "targetColumn": "eigendom_type",
        "valueMap": {
          "T001258": "totaal",
          "A028867": "huur",
          "A028868": "koop"
        }
      },
      {
        "cbsDimension": "Opdrachtgever",
        "targetColumn": "opdrachtgever_type",
        "valueMap": {
          "T001209": "totaal",
          "A028184": "overheid_corporatie",
          "A028185": "markt",
          "A028186": "particulier"
        }
      }
    ]
  }$$::jsonb,
  12
)
ON CONFLICT (key) DO NOTHING;
