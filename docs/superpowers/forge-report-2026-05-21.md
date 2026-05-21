# Forge Report — 2026-05-21 (Day 2)

**Wall clock:** ~7h active over 2 days (16h overnight pause)
**Cycles completed:** 4 today (8 + 9 + 10 + 11), bringing session total to 11
**Features shipped today:** 3 merged (#182, #183, #184), 1 pending bugbot (#185)

## Shipped Features Today

| # | Feature | PR | Status | Size |
|---|---------|------|--------|------|
| 8 | Cohort/provincie/land references on time-series tiles | #182 | merged | M |
| 9 | Veiligheid choropleth → per-1000-inw rate + copy alignment | #183 (+#069 fix) | merged | S |
| 10 | Werkloze beroepsbevolking tiles in Werkgelegenheid | #184 | merged | S |
| 11 | Misdrijven per-soort breakdown tile | #185 | pending bugbot | M |

## Impact

### New use cases enabled

- **Crime-rate context**: Criminaliteit theme now shows per-1000-inwoners (PR #183), so the choropleth gradient finally answers "where does crime concentrate?" rather than just "which gemeente is biggest." Amsterdam at 89.7/1000 vs Den Haag at 68.9 is now visually meaningful.
- **Crime-type breakdown**: New horizontal-bar tile on Criminaliteit (PR #185) splits the rate into Vermogen / Vernieling / Gewelds / Verkeer / Drugs-wapens, so advisors can see policy-relevant composition (Amsterdam: 58.9 vermogen, 8.1 gewelds → clearly a property-crime story).
- **Labour-market vulnerability**: Werkgelegenheid now pairs Werkzame (#181) with Werkloze (#184), letting advisors eyeball werkloosheidspercentage (Amsterdam 2024 = 31K / 578K ≈ 5.4%) without a derived metric.

### Existing UX enriched

- **Reference series everywhere**: Line charts on all Tier-1 tiles can now show cohort / provincie / land reference series alongside the focal gemeente (PR #182), via the same `referenceVisibility` toggle the snapshot charts already used. One source-of-truth `blockToArray` helper means no more duplicated conversion logic.

### Infrastructure expanded

- **Server-side reference pipeline on time-series**: `queryTimeSeries` now accepts `references` + `cohortType` params and returns a `references` block; mirrors the snapshot endpoint, so future charts get refs for free.
- **6× row volume on data_veiligheid**: Sync widened from one SoortMisdrijf to six top-level CRI codes (25K rows), unlocking future per-soort views (choropleth per category, trend per category) without re-syncing.

## Unfinished / Next Session

| Priority | Feature | Why | Est. size |
|----------|---------|-----|-----------|
| 1 | Brede welvaart cross-domain overzicht theme | Stitches the 5 supercategory KPIs into one starting page advisors actually open first | M |
| 2 | Bouwjaar-woningen verdeling tile in Wonen | Verduurzaming/renovatie advisors look for this before energielabel; CBS has it gemeente-level | S |
| 3 | National "land" reference on Criminaliteit choropleth | Lets advisor see "we're above NL average" at a glance — uses #182 infra | S |
| 4 | ADR-005: consolidate `tiles` ↔ `dashboard_templates.tiles` | Dual-storage drift will burn us when user templates merge in; tackling pre-EPIC #106 saves rework | M |

## Observations

- **Veiligheid required 3 touches**: cycle 9 measure swap, then a labels-fix mini-cycle for bugbot (Medium + Low across two rounds), then cycle 11 for the breakdown. The bugbot rounds did catch real misleading copy — worth the time. Lesson: when switching a measure, audit user-facing strings in the same migration, not after.
- **Shared dev/prod DB volume** is convenient (migrations applied during dev are already live) but means cycle-9-style "migration already in `_migrations` but file edited" requires a manual `psql` apply. Noted for future migration-evolution cases.
- **Bugbot pacing cap of 2 fix rounds worked well**: PR #183 had 1 Medium → fix → 1 Low → fix → clean. Both findings were genuine.
- **Drift detected at cycle 12**: three Veiligheid cycles in a row, then catalogue-searching for Mobiliteit alternatives that don't exist at gemeente level. Stopped, wrote this report instead. Forge skill's "circling the same area" signal fired correctly.

## Deploy state

`docker compose build && up -d app` ran after PR #183 + #184 merged. Prod DB has migrations 067/068/069 applied (shared volume); container restarted to pick up new code. PR #185 (per-soort breakdown) is one bugbot review away from merge — its tile renders from existing infrastructure, so no code rebuild needed once merged.
