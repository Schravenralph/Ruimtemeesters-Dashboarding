# Forge Spec: Veiligheid supercategory scaffold — Criminaliteit theme

**Cycle:** 6 | **Clock:** 66m elapsed | **Size:** medium

## What

Scaffold the **Veiligheid** supercategory (PRODUCT-VISION Stage 4 fourth). First inhabitant: `criminaliteit` theme backed by CBS 83648NED filtered to **totaal geregistreerde misdrijven** (Measure M004200_2 + SoortMisdrijf T001161) at gemeente level. Closes scaffold #90 and ships cycle 1 of EPIC #161.

## Why

Closes the Stage-4 supercategory quartet (Economie + Mobiliteit + Veiligheid alongside the already-existing Wonen + Duurzaamheid) in a single day. Geregistreerde criminaliteit is the canonical veiligheid anchor metric — what every gemeente uses for veiligheidsdriehoek-gesprekken with police + OM.

## Success criteria

1. `veiligheid` supercategories row with Shield icon resolved.
2. `criminaliteit` theme renders at `/dashboard/criminaliteit`.
3. CBS 83648NED sync lands ≥4000 rows (464 gemeenten × multiple years × totaal misdrijf).
4. Amsterdam (GM0363) shows realistic crime count (~80-100K registered annually).

## Approach

Same pattern as cycles 1, 3, 5:
- supercategories `veiligheid`, sort_order 4, icon `Shield`, color `#dc2626`.
- `data_veiligheid` table (geo_code, year, misdrijf_type, value).
- `veiligheid_misdrijven` data_source with sync_config pinned to M004200_2 + T001161.
- `criminaliteit` theme + 1 KPI (deltaDirection 'lower-is-good').
- 2 tiles (line trend + choropleth).
- Register `Shield` icon in Sidebar.

## Not doing

- Per-1000-inwoners rate (M004200_4) — could replace M004200_2 in a follow-up; absolute count is fine for the scaffold KPI.
- Per-type misdrijf breakdowns (CRI1000 vermogensmisdrijven, etc.) — separate cycle once the pattern proves itself.
- Veiligheidsmonitor self-reported data (85146NED) — different methodology, separate theme.
- Huiselijk geweld (84848NED et al.) — sensitive topic, deserves its own framing pass.
