# Forge Spec: Werkloze beroepsbevolking tile in Werkgelegenheid

**Cycle:** 10 | **Clock:** ~23h elapsed (overnight pause) | **Size:** small

## What

Add a second metric to the Werkgelegenheid theme: **Werkloze beroepsbevolking** (unemployed people in the labour force) alongside the existing Werkzame count. Sources the same CBS table 86276NED, Measure 3000800_2. Adds a KPI and a trend tile so an advisor can see both halves of the labour market on one page.

## Why

PR #181 (cycle 7) scaffolded Werkgelegenheid with only the Werkzame (employed) count. Advisors looking at labour-market vulnerability ask the inverse question too: how many people are looking for work? Pairing the two enables the "werkloosheidspercentage" intuition (werkloos / (werkzaam+werkloos)) by sight, even before we surface that explicitly.

## Success criteria

1. `data_werkloosheid` populated for all gemeenten × available years (2003-2024 typically).
2. Werkgelegenheid theme renders 4 tiles: Werkzame trend + choropleth + Werkloze trend + KPI.
3. Amsterdam shows ~30K werkloos (≈6-7% of ~460K werkzame).

## Approach

- Migration 068: new table `data_werkloosheid` mirroring `data_werkgelegenheid` structure (geslacht dimension, valueScale 1000).
- New `data_sources` row `werkloosheid` → 86276NED Measure 3000800_2.
- Two new tiles on Werkgelegenheid theme (line + KPI), one new KPI row in theme.kpi_config.
- Run sync via `pnpm exec tsx src/server/db/sync-cbs.ts -- --source werkloosheid`.

## Not doing

- Werkloosheidspercentage (ratio) — would need a derived/computed metric. Out of scope for a small cycle; advisor can eyeball it from absolute counts.
- Niet-beroepsbevolking (Measure 3000810_2) — third axis; skip until there's demand.
- Per-geslacht breakdown tile — the data is dimensioned but the focal-tile pattern aggregates.
