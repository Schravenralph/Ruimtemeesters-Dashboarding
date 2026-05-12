-- Issues #83 + #84 (EPIC #106). Fill themes.kpi_config for the 9 system themes
-- that ship with an empty config (KpiStrip silently hides on these — 67% of
-- the per-gemeente drilldown surface).
--
-- Every entry is derived from documented rules in
--   docs/superpowers/specs/forge-2026-05-12-005-kpi-config-auto-derive.md
--
-- Algorithm:
--   1. One top-level KPI per distinct data_source the theme's tiles reference,
--      labelled with data_sources.name and carrying the source's deltaDirection.
--   2. Up to 2-3 dimension-split KPIs from the first multi-valued dimension in
--      the theme's tiles, IFF its distinct values are not CBS-coded.
--   3. Split KPIs use deltaDirection='neutral' (per-value interpretation varies).
--   4. Cap at 4 entries per theme.
--   5. Skipped for CBS-coded dimensions (e.g. 85640ned.geboorteland: 'A051735'…).
--
-- Idempotent: only fills themes whose kpi_config is currently NULL or [].

-- ── Wonen — missing themes ────────────────────────────────────────────────

UPDATE themes SET kpi_config = '[
  {"label": "Bevolking", "dataSource": "bevolking", "format": "compact", "deltaDirection": "neutral"},
  {"label": "0-14 jaar", "dataSource": "bevolking", "dimension": "age_group", "dimensionValue": "0-14", "format": "compact", "deltaDirection": "neutral"},
  {"label": "65+ jaar", "dataSource": "bevolking", "dimension": "age_group", "dimensionValues": ["65-74", "75+"], "format": "compact", "deltaDirection": "neutral"}
]'::jsonb
WHERE slug = 'prognose' AND (kpi_config IS NULL OR jsonb_array_length(kpi_config) = 0);

UPDATE themes SET kpi_config = '[
  {"label": "Bevolking", "dataSource": "bevolking", "format": "compact", "deltaDirection": "neutral"},
  {"label": "15-64 jaar", "dataSource": "bevolking", "dimension": "age_group", "dimensionValues": ["15-29", "30-44", "45-64"], "format": "compact", "deltaDirection": "neutral"},
  {"label": "65+ jaar", "dataSource": "bevolking", "dimension": "age_group", "dimensionValues": ["65-74", "75+"], "format": "compact", "deltaDirection": "neutral"}
]'::jsonb
WHERE slug = 'groeianalyse' AND (kpi_config IS NULL OR jsonb_array_length(kpi_config) = 0);

UPDATE themes SET kpi_config = '[
  {"label": "Bevolking", "dataSource": "85640ned", "format": "compact", "deltaDirection": "neutral"}
]'::jsonb
WHERE slug = '85640ned' AND (kpi_config IS NULL OR jsonb_array_length(kpi_config) = 0);

-- ── Duurzaamheid ──────────────────────────────────────────────────────────

UPDATE themes SET kpi_config = '[
  {"label": "Energieverbruik", "dataSource": "energie", "format": "compact", "deltaDirection": "higher-is-bad"},
  {"label": "Hernieuwbare energie", "dataSource": "hernieuwbaar", "format": "compact", "deltaDirection": "higher-is-good"},
  {"label": "Afval", "dataSource": "afval", "format": "compact", "deltaDirection": "higher-is-bad"}
]'::jsonb
WHERE slug = 'duurzaamheid-overzicht' AND (kpi_config IS NULL OR jsonb_array_length(kpi_config) = 0);

UPDATE themes SET kpi_config = '[
  {"label": "Energieverbruik", "dataSource": "energie", "format": "compact", "deltaDirection": "higher-is-bad"},
  {"label": "Hernieuwbare energie", "dataSource": "hernieuwbaar", "format": "compact", "deltaDirection": "higher-is-good"}
]'::jsonb
WHERE slug = 'energietransitie' AND (kpi_config IS NULL OR jsonb_array_length(kpi_config) = 0);

UPDATE themes SET kpi_config = '[
  {"label": "Energieverbruik", "dataSource": "energie", "format": "compact", "deltaDirection": "higher-is-bad"},
  {"label": "Aardgas", "dataSource": "energie", "dimension": "fuel_type", "dimensionValue": "aardgas", "format": "compact", "deltaDirection": "neutral"},
  {"label": "Elektriciteit", "dataSource": "energie", "dimension": "fuel_type", "dimensionValue": "elektriciteit", "format": "compact", "deltaDirection": "neutral"},
  {"label": "Stadsverwarming", "dataSource": "energie", "dimension": "fuel_type", "dimensionValue": "stadsverwarming", "format": "compact", "deltaDirection": "neutral"}
]'::jsonb
WHERE slug = 'energie' AND (kpi_config IS NULL OR jsonb_array_length(kpi_config) = 0);

UPDATE themes SET kpi_config = '[
  {"label": "Hernieuwbare energie", "dataSource": "hernieuwbaar", "format": "compact", "deltaDirection": "higher-is-good"},
  {"label": "Zonnepanelen", "dataSource": "hernieuwbaar", "dimension": "energy_source", "dimensionValue": "zonnepanelen", "format": "compact", "deltaDirection": "neutral"}
]'::jsonb
WHERE slug = 'hernieuwbare-energie' AND (kpi_config IS NULL OR jsonb_array_length(kpi_config) = 0);

UPDATE themes SET kpi_config = '[
  {"label": "Afval", "dataSource": "afval", "format": "compact", "deltaDirection": "higher-is-bad"},
  {"label": "Restafval", "dataSource": "afval", "dimension": "waste_type", "dimensionValue": "restafval", "format": "compact", "deltaDirection": "neutral"},
  {"label": "GFT", "dataSource": "afval", "dimension": "waste_type", "dimensionValue": "gft", "format": "compact", "deltaDirection": "neutral"},
  {"label": "Glas", "dataSource": "afval", "dimension": "waste_type", "dimensionValue": "glas", "format": "compact", "deltaDirection": "neutral"}
]'::jsonb
WHERE slug = 'circulair' AND (kpi_config IS NULL OR jsonb_array_length(kpi_config) = 0);

UPDATE themes SET kpi_config = '[
  {"label": "Afval", "dataSource": "afval", "format": "compact", "deltaDirection": "higher-is-bad"},
  {"label": "Restafval", "dataSource": "afval", "dimension": "waste_type", "dimensionValue": "restafval", "format": "compact", "deltaDirection": "neutral"},
  {"label": "GFT", "dataSource": "afval", "dimension": "waste_type", "dimensionValue": "gft", "format": "compact", "deltaDirection": "neutral"},
  {"label": "Glas", "dataSource": "afval", "dimension": "waste_type", "dimensionValue": "glas", "format": "compact", "deltaDirection": "neutral"}
]'::jsonb
WHERE slug = 'afval-circulair' AND (kpi_config IS NULL OR jsonb_array_length(kpi_config) = 0);
