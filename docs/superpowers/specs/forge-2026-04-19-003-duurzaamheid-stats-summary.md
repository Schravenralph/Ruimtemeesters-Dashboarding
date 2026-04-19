---
name: Duurzaamheid StatsSummary KPI strip
description: Add a KPI strip for the duurzaamheid overview mirroring the wonen StatsSummary — 4 KPIs with YoY change + inline sparklines for energie, emissies, hernieuwbaar, afval
---

# Forge Spec: Duurzaamheid StatsSummary

**Cycle:** 3 | **Clock:** 0.3h elapsed | **Size:** medium

## What
- Backend: new `/api/stats/overview/duurzaamheid` endpoint returning grand totals + YoY change for energie, emissies (CO2), hernieuwbaar (installaties), afval.
- Backend: extend `/api/stats/timeseries/:source` to accept energie / emissies / hernieuwbaar / afval as sources (for sparklines).
- Frontend: new `DuurzaamheidStats.tsx` component, structurally similar to `StatsSummary`, with 4 KPI cards + inline sparklines.
- Wire it into `DashboardPage` for duurzaamheid overview themes.
- Drive-by: add missing emissies card to `OverviewGrid.DUURZAAMHEID_CONFIG`.

## Why
`DashboardPage.tsx:168-169` explicitly skips `StatsSummary` and `QuickInsights` for duurzaamheid themes, leaving the duurzaamheid overview visibly thinner than the wonen overview. Advisors working on sustainability have less context at-a-glance than those working on wonen. Emissies is also missing from the current duurzaamheid OverviewGrid entirely.

## Success criteria
1. `curl /api/stats/overview/duurzaamheid?geoCode=NL&year=2024` returns all 4 KPIs with values + changes.
2. `curl /api/stats/timeseries/energie?geoCode=NL` returns a multi-year series.
3. Duurzaamheid overview page renders the 4-KPI strip above the OverviewGrid.
4. OverviewGrid shows 4 cards (adds emissies).

## Approach
- Reuse the SOURCE_CONFIGS pattern: single-row grand-total queries with `cbs_actuals > cbs_prognose` priority ordering. Each config hardcodes which dims to pin to 'totaal' and which dim supplies the KPI value.
- Sparklines: extend `getTimeSeriesAgg` `sourceQueries` map with 4 new entries mirroring the grand-total filters.
- Component: no unit conversion in UI — show value + unit label (TJ, ton CO2-eq, installaties, kg/inwoner).

## Not doing
- Not adding a duurzaamheid prognose hero card (TSA forecasts are for wonen only today).
- Not adding QuickInsights equivalent for duurzaamheid (separate cycle).
- Not redesigning card layout; mirror StatsSummary structure.
