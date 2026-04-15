# Forge Spec: Prognose Year Labels in FilterBar

**Cycle:** 2 | **Clock:** 0.1h elapsed | **Size:** small

## What
Mark prognose years (2025+) in the FilterBar year dropdown so users know they're viewing forecasted data. Add a small "prognose" badge on the DashboardTile header when the selected year falls in the prognose range.

## Why
Users can select 2028 from the year dropdown without any indication it's AI-forecasted data. This erodes trust — they might think CBS published 2028 actuals, or worse, not realize they're looking at predictions.

## Success criteria
1. Year dropdown shows "(prognose)" suffix for years where only prognose data exists
2. Tile header shows a purple "prognose" badge when viewing a future year

## Approach
- FilterBar: compare available years against a threshold (latest CBS actuals year) to label prognose years
- DashboardTile: check `filters.period.year` against the threshold and show badge

## Not doing
- Changing the data layer or API
- OverviewGrid sparklines (separate cycle)
