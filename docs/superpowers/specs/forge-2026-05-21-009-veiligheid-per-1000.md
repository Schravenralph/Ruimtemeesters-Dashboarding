# Forge Spec: Veiligheid choropleth → per-1000-inwoners rate

**Cycle:** 9 | **Clock:** ~22h elapsed (overnight pause) | **Size:** small

## What

Add a second metric (`per_1000_inw`) to `data_veiligheid` populated from CBS 83648NED's Measure M004200_4 (Geregistreerde misdrijven per 1000 inw.) alongside the existing `totaal` (M004200_2). Switch the source default_filters so the choropleth + KPI render the rate not the absolute count. The trend line and absolute counts stay accessible via metric-pin in tile config.

## Why

EPIC #161 cycle 1 (PR #180) shipped Criminaliteit with absolute counts. The choropleth currently shows Amsterdam darkest because it has the most inhabitants — not because crime is concentrated there. Per-1000 makes the gradient meaningful: "where is crime above the per-capita average?". That's the question gemeenten actually ask.

## Success criteria

1. `data_veiligheid.misdrijf_type='per_1000_inw'` populated for all gemeenten × 2010-2025.
2. Criminaliteit choropleth + KPI render the per-1000 rate by default.
3. Amsterdam shows a realistic rate (~80-100 per 1000 inw) — close to NL average rather than dominating.

## Approach

- Add Measure M004200_4 to the existing 83648NED sync_config (keep M004200_2 too — two-measure pattern via an OR in the filter).
- Use the `metric` column convention: store `misdrijf_type` values as `totaal` (M004200_2) and `per_1000_inw` (M004200_4). One source, two metric values via valueMap. Wait — the existing dimension is `SoortMisdrijf` mapping `T001161 → totaal`. CBS doesn't have a per-1000 SoortMisdrijf value — the rate IS a different Measure.
- Two-source design instead: add a SECOND data_source `veiligheid_per_1000` bound to the same table, syncing the M004200_4 measure with a `constantColumns.misdrijf_type = 'per_1000_inw'` (using the cycle-1 constantColumns plumbing).
- Update the source's `default_filters` so the choropleth + KPI default to the new rate-based metric.

## Not doing

- Renaming `misdrijf_type` column — the dimension naming is awkward but renaming would be invasive. Future cleanup.
- Per-soort-misdrijf breakdowns (vermogen vs. geweld vs. openbare orde) — separate cycle.
- TSA prognose on crime — out of scope.
