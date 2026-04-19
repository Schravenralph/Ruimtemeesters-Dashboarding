---
name: Report page duurzaamheid sources
description: Extend Rapport generator to cover all 4 duurzaamheid sources (energie, emissies, hernieuwbaar, afval) with per-source unit labels
---

# Forge Spec: Report page supports duurzaamheid sources

**Cycle:** 1 | **Clock:** <1h elapsed | **Size:** medium

## What
Extend `/api/reports/:source` + `ReportPage.tsx` so advisors can generate structured reports for the 4 duurzaamheid data sources (energie, emissies, hernieuwbaar, afval). Report response now carries a `unit` string so values render with their unit (e.g. "140,400 ton CO2-eq").

## Why
Advisors in the "Duurzaamheid" supercategory currently have no way to generate rapport output. The Rapport page source selector hardcodes 4 wonen sources. The overview page has data-driven insights for duurzaamheid (#20), but clicking through to `/rapport?source=energie` silently fails because the backend rejects unknown sources. Dead-end user journey.

## Success criteria
1. Report page Select lists all 8 sources (4 wonen + 4 duurzaamheid) with a supercategory-grouped dropdown or clear labels
2. `curl /api/reports/energie?geoCode=NL&year=2024` returns a valid report with grand total + breakdown
3. Same for emissies, hernieuwbaar, afval
4. UI renders unit after numeric value (e.g. "140,400 ton CO2-eq")

## Approach
- Extend `SOURCE_CONFIGS` in `report.service.ts` with energie/emissies/hernieuwbaar/afval entries. Each config picks sensible dim breakdown + grand total filters based on the observed data shape.
- Add optional `totalLabel` to handle non-obvious grand-total semantics (emissies grand total = CO2 specifically).
- Report response gains a `unit` field (read from `data_sources.unit`).
- ReportPage.tsx extends Select options and appends unit to formatted values.

## Not doing
- Not adding trend/timeseries to the report (separate cycle)
- Not adding prognose years to report (separate cycle — requires forecast metadata)
- Not making the source list fully registry-driven (would require grouping UI; out of scope)
- Not adding PDF export (separate infrastructure cycle)
