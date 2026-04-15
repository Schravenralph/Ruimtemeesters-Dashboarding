# Forge Spec: Line Chart Tiles Use Time Series Data

**Cycle:** 1 | **Clock:** 0h elapsed | **Size:** medium

## What
DashboardTile currently uses `useDataQuery` (single-year snapshot) for ALL chart types. Line chart tiles need `useTimeSeriesQuery` to show the full historical series + TSA prognose with confidence bands. Without this, the Prognose theme's main tile shows a single dot instead of a 37-year trend with forecast.

## Why
Users navigating to /dashboard/prognose or /dashboard/bevolking see line chart tiles with one data point. The entire prognose UX (purple zones, confidence bands, "Prognose -->" labels) is invisible because the data never reaches the LineChart component. This is the #1 blocker to showcasing the TSA engine.

## Success criteria
1. Line chart tiles render full time series (all years) when tile.chartType is 'line'
2. Prognose data (dashed purple line, confidence bands, transition marker) is visible in tiles
3. Other chart types (bar, pie, choropleth, table) continue using single-year `useDataQuery`

## Approach
- Modify `DashboardTile.tsx` to conditionally use `useTimeSeriesQuery` when `chartType === 'line'`
- Pass dimension/dimensionValue from tile config to the time series hook
- Ensure the data format matches what `LineChartComponent` expects

## Not doing
- Changing OverviewGrid mini-charts (separate cycle)
- Adding year labels to FilterBar dropdown (separate cycle)
- Gemeente comparison features (separate cycle)
