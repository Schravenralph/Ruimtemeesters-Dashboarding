# Forge Spec: Economie supercategory — Werkgelegenheid theme

**Cycle:** 7 | **Clock:** 76m elapsed | **Size:** medium

## What

Third inhabitant of Economie (after Bedrijvigheid + Inkomen). New `werkgelegenheid` theme backed by CBS 86276NED filtered to Measure 3000795_2 (**werkzame beroepsbevolking**) + Geslacht T001038 (totaal). Uses the `valueScale: 1000` plumbing from cycle 4 (#178) — CBS publishes the count × 1000 and we store actual person counts so compact renders correctly.

## Why

Cycles 1+3 gave Economie two themes; cycle 7 makes it three — matching the depth of Mobiliteit/Veiligheid and edging closer to Wonen-level coverage. Werkzame beroepsbevolking is the canonical "how many people in this gemeente work?" metric — pairs naturally with the Bedrijvigheid (employers) and Inkomen (earnings) tiles.

## Success criteria

1. `werkgelegenheid` theme renders at `/dashboard/werkgelegenheid` with the trend tile populated for Amsterdam.
2. CBS 86276NED sync lands ≥4,000 rows (≈432 gemeenten × 2013-2025 years × totaal filter).
3. Amsterdam shows realistic werkzame beroepsbevolking (~450K-500K).

## Approach

Mirror cycle 1's Bedrijvigheid + cycle 3's Inkomen pattern:
- New `data_werkgelegenheid` table (geo_code, year, geslacht, value).
- `werkgelegenheid` data_source. valueScale=1000 in sync_config.
- `werkgelegenheid` theme + 1 KPI ('higher-is-good').
- 2 tiles: line trend + choropleth.

## Not doing

- Werkloze beroepsbevolking (3000800_2) — separate cycle for the unemployment narrative.
- Geslacht/leeftijd breakdown — keep the totaal slice for scaffold; subgroup variations are follow-ups.
- Niet-beroepsbevolking / arbeidsdeelname-percentage — same data, derived metric; future cycle.
