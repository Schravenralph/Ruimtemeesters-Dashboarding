-- Cohort definitions + memberships for per-municipality drilldown referential view.
-- Implements ADR-003 §"Cohort definitions" + SPEC docs/superpowers/specs/2026-05-09-cohort-referential-data-design.md
--
-- A "cohort" is a set of municipalities the focal gemeente is referentially
-- compared against. v1 ships three cohort_types:
--   - 'stedelijkheid'      — CBS stedelijkheidsklasse 1-5 (sourced from CBS Gebieden in Nederland)
--   - 'populatiegrootte'   — population-size bins (derived from data_bevolking totals)
--   - 'woningmarktregio'   — statutory ABF/BZK woningmarktregio (sourced from same CBS table)
-- Optional 4th cohort_type 'krimp_anticipeer' from a hand-curated 2019 mapping CSV.
--
-- Membership is per-cohort-type 1-to-1: each gemeente has at most one cohort_key
-- per cohort_type. Gemeenten not in any krimp/anticipeer regio have no row for
-- that cohort_type — comparison falls back to provincie + national only.

CREATE TABLE IF NOT EXISTS cohort_definitions (
  cohort_type        VARCHAR(50)  NOT NULL,
  cohort_key         VARCHAR(100) NOT NULL,
  name               VARCHAR(255) NOT NULL,
  description        TEXT,
  source             VARCHAR(255) NOT NULL,
  source_url         TEXT,
  source_vintage     DATE         NOT NULL,
  theme_default_for  TEXT[]       NOT NULL DEFAULT '{}',
  sort_order         INT          NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (cohort_type, cohort_key)
);

CREATE TABLE IF NOT EXISTS cohort_members (
  cohort_type   VARCHAR(50)  NOT NULL,
  cohort_key    VARCHAR(100) NOT NULL,
  geo_code      VARCHAR(50)  NOT NULL REFERENCES geo_areas(code) ON DELETE CASCADE,
  PRIMARY KEY (cohort_type, cohort_key, geo_code),
  FOREIGN KEY (cohort_type, cohort_key) REFERENCES cohort_definitions(cohort_type, cohort_key) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cohort_members_geo ON cohort_members(geo_code);
CREATE INDEX IF NOT EXISTS idx_cohort_members_lookup ON cohort_members(cohort_type, geo_code);
