# Forge Spec: inkomen value magnitude correctness

**Cycle:** 4 | **Clock:** 42m elapsed | **Size:** small

## What

CBS 86161NED publishes income as `EUR × 1000` — the value 44 means €44K. Stored that way in `data_inkomen.value`. The compact formatter renders 44 → "44" (no K below 1000), so the KPI looks like €44 and the tile y-axis shows 24/30/45 instead of 24K/30K/45K. Closes issue #177 filed during cycle 3.

Fix at the data layer: scale stored values to actual EUR (× 1000), change the source unit accordingly. Numbers then render correctly through the existing compact formatter — no client-side scale plumbing needed.

## Why

Cycle 3 shipped the Inkomen theme but the headline reads "44" when the right answer is "€44K". Users glancing at the KPI strip get the wrong order of magnitude — that's a credibility problem on a freshly-shipped feature. Tiny fix; high signal.

## Success criteria

1. Inkomen KPI for Amsterdam reads "44K" (or "€44K"), not "44".
2. Trend tile y-axis ticks show 30K, 45K (not 30, 45).
3. data_inkomen.value × 1000 from current to new — verified via SQL roundtrip.
4. Future syncs apply the scaling too — sync_config updated to scale at write time.

## Approach

Single migration:
- `UPDATE data_inkomen SET value = value * 1000` (one-shot rescale of existing rows).
- `UPDATE data_sources SET unit = 'EUR' WHERE key = 'inkomen'`.
- Add `valueScale: 1000` to the sync_config so future syncs apply the scaling automatically.

Sync change in `cbs-generic-sync.ts`: read optional `config.valueScale` and multiply `obs.Value` by it before insert. Backwards-compatible — no scale config means no scaling.

## Not doing

- Reformatting the existing tiles' descriptions to mention EUR — the unit field is the canonical signal.
- Per-tile formatter overrides — the source-level unit is the right level.
- Touching other sources' value scaling — only inkomen has this misalignment today.
