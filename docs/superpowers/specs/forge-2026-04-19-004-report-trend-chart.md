---
name: Rapport inline trend chart
description: Add a 10-year trend line chart to the Rapport Overzicht section, using the existing /stats/timeseries endpoint
---

# Forge Spec: Rapport inline trend chart

**Cycle:** 4 | **Clock:** 0.3h elapsed | **Size:** small

## What
Render a small line chart at the top of the Rapport "Overzicht" section showing the last 10 years of the grand total for the selected source + geo.

## Why
The Rapport page is a year-snapshot. It shows one value and maybe a YoY delta, but gives the advisor no sense of trajectory. The backend already exposes 10+ years of data via `/api/stats/timeseries/:source` (which in cycle 3 gained support for duurzaamheid sources too). A 200px inline chart turns the snapshot into a story with almost no extra work.

## Success criteria
1. Opening `/rapport?source=bevolking` with NL/2024 shows a line chart above the Totaal row, with x-axis 2014-2024.
2. Switching the source or geoCode re-fetches the timeseries.
3. Chart prints cleanly (no tooltip interactions required at print time).

## Approach
- `ReportPage` fetches `/api/stats/timeseries/{source}?geoCode={geoCode}` in parallel with the report call.
- Render a recharts `LineChart` with `XAxis` (year) and `YAxis` (value formatted compactly).
- Chart sits inside the first section card, below the section title, above the data rows.

## Not doing
- No prognose markings — that's the separate prognose support cycle.
- No compare-line for a second geo.
- No confidence bands.
