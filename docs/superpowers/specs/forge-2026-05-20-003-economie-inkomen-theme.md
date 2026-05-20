# Forge Spec: Economie supercategory — Inkomen theme

**Cycle:** 3 | **Clock:** 29m elapsed | **Size:** medium

## What

Second inhabitant of the Economie supercategory. New `inkomen` theme backed by CBS 86161NED "Inkomen van huishoudens; huishoudenskenmerken, regio (indeling 2025)" filtered to:
- Measure: M000222 (gemiddeld gestandaardiseerd inkomen — comparable, household-size-corrected)
- KenmerkenVanHuishoudens: 1050010 (alle particuliere huishoudens)
- Populatie: 1050010 (incl. studenten)

Ships data_inkomen table, vestigingen-style sync_config, and 2 tiles (line trend + choropleth).

## Why

Cycle 1 scaffolded Economie with Bedrijvigheid; cycle 3 demonstrates the supercategory has BREADTH by adding a second theme on a completely different metric (households' standardized income vs. business establishments count). Inkomen is one of the most-asked-for gemeente-level metrics by Dutch govs — it underpins armoede, woonlasten, voorzieningenvraag narratives.

## Success criteria

1. `inkomen` theme renders at `/dashboard/inkomen` with the trend tile populated for Amsterdam.
2. CBS 86161NED sync lands ≥4,000 rows (≈342 gemeenten × ~14 years).
3. Amsterdam shows realistic standardized income (~30K-35K EUR for late years).

## Approach

Single migration. Mirror the Bedrijvigheid pattern from cycle 1.

- New table `data_inkomen` (geo_code, year, huishouden_type, populatie, value).
- New data_source `inkomen`, supercategory=economie, filter pins M000222 + Particuliere huishoudens + incl-studenten.
- New `inkomen` theme + 1 KPI (gem. gestandaardiseerd inkomen).
- 2 tiles: line trend + choropleth.

## Not doing

- Inkomensspreiding deciles (1020870-1020920) — separate cycle for an inequality view.
- Other Economie themes (werkgelegenheid, toerisme) — separate cycles.
- Cross-source overzicht ("welvaart") tile mixing inkomen + vestigingen — separate cycle once both have shipped.
