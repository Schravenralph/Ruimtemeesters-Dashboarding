# Forge Spec: afval-circulair tile expansion

**Cycle:** 2 | **Clock:** 17m elapsed | **Size:** small

## What

Add 3 tiles to the `afval-circulair` theme that surface the rich `data_afval` data already present in the DB (7 waste types × ~12K rows each, 1998-2030). Theme currently ships 2 tiles; the picker is sparse and the per-gemeente narrative is shallow.

## Why

EPIC #157 calls this out explicitly: "tile-picker has 2/5 entries; needs more sources". The data is **already there** — no sync work, no schema changes, just SQL INSERT-into-tiles. Highest ROI per minute of any candidate cycle: gemeente-officials get a real waste-mix picture without any new infrastructure.

## Success criteria

1. afval-circulair theme has ≥5 tiles (currently 2 → ≥5).
2. New tiles render real data for Amsterdam (GM0363): restafval trend, multi-stream comparison, per-gemeente choropleth.
3. No regressions on existing 2 tiles.

## Approach

Single migration `058_afval_circulair_tiles.sql`. Three new `tiles` rows:
- **Restafval — kg per inwoner**: line, dataSource=afval, dimensions=['waste_type'], `filterDimension/filterValue=waste_type/restafval` via tile config.
- **Afvalstromen vergeleken**: line, dataSource=afval, dimensions=['waste_type'], no filter → multi-line with one line per waste type (relies on the multi-line dimensionValue fix from #173).
- **Restafval per gemeente**: choropleth, dataSource=afval, dimensions=['waste_type'], filter restafval, latest year.

All three use `metric=kg_per_inwoner` via `default_filters` on the source (already set, or set in this migration if not).

## Not doing

- Fixing the data inconsistency between `kg_per_inwoner` and `per_inwoner_kg` metric naming — separate cleanup PR.
- Sub-municipal granularity (postcode4) — currently aggregated at gemeente.
- TSA-prognose on afval rows — not in the data model for this source.
- New CBS sources for afval (already covered by 83452NED).
