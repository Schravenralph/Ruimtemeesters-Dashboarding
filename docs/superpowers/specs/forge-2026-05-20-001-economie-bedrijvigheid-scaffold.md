# Forge Spec: Economie supercategory scaffold — Bedrijvigheid theme

**Cycle:** 1 | **Clock:** 0h elapsed | **Size:** medium

## What

Scaffold the **Economie** supercategory and ship its first theme — **Bedrijvigheid** (vestigingen-count per gemeente over time). Plumbs through everything Wonen has: supercategory row, theme row, data_source row, sync_config that pulls CBS 81575NED filtered to total-SBI rows, and 2 tiles that surface the data on the per-gemeente dashboard.

## Why

PRODUCT-VISION Stage 4. Today the platform offers Wonen + Duurzaamheid only — half of all themes are wonen. The user explicitly flagged this: *"het moet een overstijgend monitorend systeem worden niet alleen maar wonen wonen wonen"*. Economie is the most-requested next supercategory; Bedrijvigheid (number of businesses per gemeente per year) is the obvious anchor metric — gemeente-level (266K records in 81575NED), 2007-2026 coverage, single clean measure (M000200 = Vestigingen). Closes scaffold issue #88 and starts EPIC #159.

## Success criteria

1. `economie` row exists in `supercategories`; theme picker shows the Economie group.
2. `bedrijvigheid` theme renders at `/dashboard/bedrijvigheid` with at least 2 tiles populated from real CBS data.
3. CBS 81575NED sync lands ≥6,000 rows for gemeenten (totaal-SBI subset, 2007–latest year).
4. End-to-end verified: open Amsterdam (GM0363), see the vestigingen-trend line tile render with real numbers.

## Approach

- Single migration adds supercategories row, themes row, data_sources row, tiles rows.
- Pre-filter the CBS sync to `BedrijfstakkenBranchesSBI2008 eq 'T001081'` (alle branches totaal) — keeps the initial dataset to ~7K rows instead of 266K. Sub-sector breakdown is a separate future cycle.
- One line-chart tile (vestigingen-trend per jaar) + one choropleth tile (vestigingen per gemeente latest year).
- Use existing cbs-generic-sync pipeline — no new sync code.

## Not doing

- Sub-sector (SBI) tiles — out of scope for this cycle, requires SBI value-map design.
- Other Economie themes (werkgelegenheid, inkomen, toerisme) — separate cycles.
- KvK Open Data integration — non-CBS source, separate engineering effort.
- Cohort references / provincial references on the new tiles — those rely on existing `data_sources.cohort_config` plumbing which is fine but adds risk; verify in a follow-up cycle.
