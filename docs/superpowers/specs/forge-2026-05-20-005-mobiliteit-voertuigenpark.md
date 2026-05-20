# Forge Spec: Mobiliteit supercategory scaffold — Voertuigenpark theme

**Cycle:** 5 | **Clock:** 53m elapsed | **Size:** medium

## What

Scaffold the **Mobiliteit** supercategory (PRODUCT-VISION Stage 4). First inhabitant: `voertuigenpark` theme backed by CBS 85236NED filtered to **personenauto's** (Measure A018943) at gemeente level. Closes scaffold issue #89 and ships cycle 1 of EPIC #160.

## Why

After cycles 1+3 added Economie (Bedrijvigheid + Inkomen), the platform now spans Wonen + Duurzaamheid + Economie. Mobiliteit is the next named Stage-4 supercategory — adding it widens the policy domain coverage to four. Personenauto-density is the anchor mobility metric Dutch gov-officials ask about first (parking pressure, autoluw beleid, laadinfra-planning).

## Success criteria

1. `mobiliteit` supercategories row exists with the sidebar icon resolved correctly.
2. `voertuigenpark` theme renders at `/dashboard/voertuigenpark`.
3. CBS 85236NED sync lands ≥1500 rows (360 gemeenten × 5 years).
4. Amsterdam (GM0363) shows realistic personenauto-count (~250K cars).

## Approach

Mirror cycle 1's Bedrijvigheid pattern:
- supercategories row: mobiliteit, sort_order 3, icon `Car`
- data_voertuigen table with `voertuig_type` dimension
- data_sources `voertuigen`, CBS 85236NED, filter `Measure eq 'A018943'`
- themes row, 1 KPI (personenauto's totaal)
- 2 tiles: line trend + choropleth

Register `Car` in Sidebar.tsx iconMap (mirrors Briefcase/Banknote).

## Not doing

- Other vehicle types (bedrijfsvoertuigen, motorfietsen) — separate cycle once the picker pattern is clear.
- Verkeersveiligheid (verkeersdoden, ongevallen) — separate theme.
- Bereikbaarheid / OV-density — separate cycle, different data source.
- Older 37209hvv data for 2000-2018 — newer 85236NED's 2019-2023 is enough for the scaffold; longer history is a follow-up.
