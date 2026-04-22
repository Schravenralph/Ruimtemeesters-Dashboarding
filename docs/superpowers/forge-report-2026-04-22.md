# Forge Report — 2026-04-22

**Wall clock:** ~11h (most spent polling Cursor Bugbot)
**Active time:** ~2-3h of coding
**Cycles completed:** 6 (PRs #51–#56, all merged)
**Theme:** wire up orphan backend features — endpoints, contexts, and components that were fully built but unreached.

## Shipped Features

| # | Feature | PR | Size |
|---|---------|----|------|
| 1 | Rapport page — inline year + compareYear picker | #51 | S |
| 2 | DataDownloadPage — dynamic sources + years from registry (+ `GET /api/data/sources`) | #52 | S |
| 3 | Tile CSV/Excel export — filter-aware + authenticated | #53 | S |
| 4 | Server-backed SettingsPage via `/api/preferences` + AppConfigContext | #54 | S |
| 5 | Post-login redirect respects saved `defaultTheme` | #55 | S |
| 6 | Admin **Datakwaliteit** tab + registry-driven quality service | #56 | S |

## Impact

### New capabilities visible to users
- **Rapport comparison workflow**: user can now compare two years directly from `/rapport`, which previously required detouring through a dashboard.
- **Full data export surface**: `DataDownloadPage` now lists every registered source (including `emissies` which was silently missing) and only offers years that actually exist in the data.
- **Tile CSV/Excel that works**: dashboard tile export was silently 401'ing and/or returning unfiltered data; now both CSV and Excel carry the same rows the user sees on screen.
- **Cross-device preferences**: `SettingsPage` choices now persist server-side via `/api/preferences`; default theme is applied on each post-login redirect.
- **Data-quality visibility**: admins see completeness, year coverage, geo coverage and null counts for every source.

### Infrastructure expanded
- `GET /api/data/sources` — projects the data-source registry for clients.
- `AppConfigProvider` mounted and reachable; `useAppConfig()` has its first real callers.
- `data-quality.service.ts` derives source list from the registry — new duurzaamheid sources get quality metrics automatically.
- `exportTile(tile, format, data)` is now the single export path; broken `fetchTileData` removed.

### Code health
- Eliminated 4 orphan files/paths (fetchTileData, DATA_TABLES hardcoded map, SettingsPage localStorage-only flow, AppConfigProvider dead code).
- All shipped cycles were small-size; no backlog of half-finished work.

## Unfinished / Next Session

| Priority | Feature | Why | Est. size |
|----------|---------|-----|-----------|
| 1 | `config.defaultYear` → initial FilterState | Companion to #55; requires resolving the timing between AppConfigProvider load and PresentationContext's initial presentation creation | S |
| 2 | `config.compactNumbers` / `chartAnimations` wired through chart components | Currently persisted but never read | M |
| 3 | `/api/trends` endpoint (orphan) — admin or dashboard trend explorer | Trends controller exists with compare support; zero callers | M |
| 4 | `/api/notifications` endpoint wiring | Service exists; no UI | S-M |
| 5 | `lastUpdated` tracking in quality service | Currently always returns `null`; would need import-tracking infra | M |

## Observations

- **Bugbot is the bottleneck**. Rough breakdown: ~20 min of scouting+spec+code per cycle, ~30–60 min polling bugbot. Four of six cycles had legitimate bugbot findings; all fixes were correctness-level (stale closures, race conditions, missing auth, dropped columns). Worth the waits, but the wall clock is dominated by them.
- **Orphan-feature mine is rich**. Every cycle but #1 found a pre-built piece that nobody had connected. Sequence: the scout "look for backend without frontend / context without consumer" kept landing well-scoped small cycles.
- **Two-step fixes for races**: cycles 5 → 4 → race fix needed inside `AppConfigContext` itself, not just at the consumer. Worth remembering: if a fix needs a loading gate, the producer must start in "loading" and must consult upstream providers' loading state.
- **Spec document discipline paid off**: every cycle has a spec file. Made scoping decisions explicit ("not doing: …"), which kept bugbot findings within-scope to address rather than feeling like scope creep.
