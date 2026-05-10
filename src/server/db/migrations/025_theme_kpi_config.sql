-- SPEC-C: KPI strip on per-gemeente drilldown view (ADR-003 §UI defaults).
-- themes.kpi_config holds an ordered array of KPI tile descriptors per theme:
-- [{ "label": "Bevolking", "dataSource": "bevolking", "dimension": null,
--    "dimensionValue": null, "deltaDirection": "neutral", "format": "compact" }, ...]
--
-- The KpiStrip component reads this column and renders one NumberDisplay
-- per entry, with vs-cohort + vs-NL delta chips per SPEC-B.
ALTER TABLE themes ADD COLUMN IF NOT EXISTS kpi_config JSONB NOT NULL DEFAULT '[]'::jsonb;
