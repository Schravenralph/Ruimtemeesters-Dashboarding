# Forge Spec: Misdrijven per soort breakdown

**Cycle:** 11 | **Clock:** ~24h elapsed (across two days) | **Size:** medium

## What

Expand the `veiligheid_misdrijven` sync to populate **five top-level misdrijfsoorten** alongside the existing `totaal` row, then add a horizontal-bar tile to the Criminaliteit theme that breaks the focal-gemeente's per-1000 rate down by category: Vermogen, Vernieling/openbare orde, Gewelds/seksueel, Verkeer, Drugs.

## Why

PR #183 ships a Criminaliteit theme with one number: total per-1000 misdrijven. An advisor looking at "we have a crime issue" needs to know **what kind** — fighting vermogensdiefstal needs different policy than fighting gewelddelicten. The breakdown is the natural next-click question. Spec 009 explicitly deferred this to "a separate cycle" — this is that cycle.

## Success criteria

1. `data_veiligheid` populated with 6 misdrijf_type rows per gemeente per year (totaal + 5 sub-categories).
2. New "Misdrijven naar soort" horizontal-bar tile on the Criminaliteit theme.
3. Amsterdam 2024 breakdown sums roughly to 89.7 (within rounding) — the existing total.

## Approach

- Migration 070: update `data_sources.sync_config.filter` and `valueMap` to include the 5 CRI categories (CRI1000 vermogen, CRI2000 vernieling, CRI3000 gewelds, CRI4000 verkeer, CRI5000 drugs/wapen). Wipe + resync.
- Add one tile (horizontal-bar, dimension=misdrijf_type, no dimensionValue pin) so the chart varies across rows.
- Defer the choropleth/KPI per-soort variants — those would multiply tiles 6×. The breakdown bar alone covers the question.

## Not doing

- Per-soort choropleth/KPI grid — 6× tiles is too many for one cycle. The breakdown bar is enough.
- Sub-sub-soort (e.g. CRI1100 diefstal vs CRI1300 valsheid) — top-level is enough resolution.
- Re-thinking the `misdrijf_type` column name — defer; consistent with existing.
