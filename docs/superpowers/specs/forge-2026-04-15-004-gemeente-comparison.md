# Forge Spec: Gemeente Comparison Panel

**Cycle:** 4 | **Clock:** 0.2h elapsed | **Size:** medium

## What
A new "Gemeentevergelijking" panel on the Groeianalyse theme that lets users compare population trends of multiple gemeenten on one chart. Uses the existing `/trends/:source/compare` backend endpoint. Pre-selects G4 cities (Amsterdam, Rotterdam, Den Haag, Utrecht) as the default comparison.

## Why
Users currently view one gemeente at a time. Comparing Amsterdam vs Rotterdam vs Utrecht growth trajectories — including TSA prognose — is the killer demo for this dashboard. The backend endpoint already exists but has zero frontend exposure.

## Success criteria
1. Multi-line chart showing population trends for 2-6 gemeenten simultaneously
2. G4 pre-selected by default, users can change selection
3. Prognose years visually distinct (dashed lines after transition year)

## Approach
- New `GemeenteComparison` component fetching from `/trends/bevolking/compare`
- Embed in the Groeianalyse theme's DashboardPage (via a config flag or direct insertion)
- Simpler: add as a standalone route/page linked from the sidebar

## Not doing
- Full drag-and-drop gemeente picker (just a multi-select)
- Comparison for non-bevolking sources (can extend later)
