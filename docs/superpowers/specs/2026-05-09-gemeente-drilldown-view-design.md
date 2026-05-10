# Per-Municipality Drilldown View Layout

**Date:** 2026-05-09
**Status:** Approved
**Implements:** ADR-003 (canonical view) + the Stage 1 exit criterion in `PRODUCT-VISION.md`
**Depends on:** SPEC `2026-05-09-cohort-referential-data-design.md` (cohort API), SPEC `2026-05-09-reference-series-rendering-design.md` (chart-level refs)

## Summary

Define what the focal-gemeente landing page actually looks like. Theme-agnostic shell: every theme's prebuilt dashboard reuses the same drilldown frame (gemeente picker, cohort affordances, KPI strip, chart grid) and plugs in its own tiles.

This spec is the *page-level UX contract*. SPEC-B owns *per-chart* reference rendering. SPEC-D owns *project bootstrap*. This spec sits between them — what the user sees after they land in a project.

## Success Criteria

| Metric | Threshold |
|--------|-----------|
| First contentful paint after navigation | < 800 ms p95 |
| Time to fully-rendered KPI strip | < 1.5 s p95 (single `/api/data/query` per KPI tile, parallel) |
| Reference visibility toggles persist per-tab | via `Presentation.referenceVisibility` (SPEC-B) |
| Default cohort type per supercategory honoured | Wonen → woningmarktregio; others → populatiegrootte (from `CohortMembershipsResponse.defaultByTheme`) |
| Mobile (≤ 640 px) renders | KPI strip stacks; chart grid single-column; gemeente picker collapses to icon button |
| A11y | Focal gemeente announced via `aria-live="polite"` on change; cohort affordance keyboard-navigable; reference legend has text labels (not just colour) |
| Backwards compatibility | Existing `DashboardPage` continues to function for non-gemeente focal levels (land, provincie, COROP) — no regression |
| TypeScript | 0 errors |
| Tests | Component tests for header + KPI strip + cohort affordance; visual smoke test for each Wonen theme |

## Page Anatomy

```
┌──────────────────────────────────────────────────────────────────┐
│ ProjectSwitcher │ SupercategoryNav │ ThemeNav │ user/settings    │  ← header (existing, lightly extended)
├──────────────────────────────────────────────────────────────────┤
│ GemeenteHeader: [Amsterdam ▾]   stedelijkheidsklasse 1 · 882k inw│  ← NEW
│ Cohort: [Woningmarktregio Amsterdam ▾]  ☑ Cohort  ☑ Provincie ☑ NL│
├──────────────────────────────────────────────────────────────────┤
│ KpiStrip (4-6 cards):                                            │  ← NEW
│  [Bevolking 882k  vs cohort +3.2%  vs NL +0.4%]                  │
│  [Huishoudens …] [Woningvoorraad …] [Woningtekort …]             │
├──────────────────────────────────────────────────────────────────┤
│ Tile grid (existing TileGrid, unchanged):                        │
│  [Bevolking trend][Huishoudens type][Woningvoorraad jaar]…       │
│  Each tile shows refs per SPEC-B                                 │
└──────────────────────────────────────────────────────────────────┘
```

When focal level is **not** gemeente (e.g. user picked a provincie or NL):
- `GemeenteHeader` shows the focal area name + level + summary stats (no stedelijkheidsklasse).
- Cohort affordance hidden (cohorts are gemeente-scoped in v1).
- KPI strip still renders, but delta chips show only "vs NL" (cohort and provincie unavailable for non-gemeente focal).
- Chart grid renders as before, references off for non-gemeente focal levels.

This way the existing dashboard view degrades gracefully — no breakage for users currently looking at NL or provincie level.

## Component Design

### GemeenteHeader

```typescript
interface GemeenteHeaderProps {
  geoCode: string;                       // current focal
  geoLevel: GeoLevel;                    // 'land' | 'provincie' | 'corop' | 'gemeente'
  onChange: (newCode: string) => void;
}
```

Renders:
- Geo picker (reuses existing `GeoHierarchy` browser as a popover trigger).
- Inline summary chips (only for gemeente level): stedelijkheidsklasse, current population, parent provincie name. Pulled from `/api/cohorts/:gemeenteCode` + `/api/data/query?source=bevolking&geoCode=…&year=latest`.
- Announces change via `aria-live`.

### CohortToggles (mounts under GemeenteHeader)

```typescript
interface CohortTogglesProps {
  memberships: CohortMembership[];       // from /api/cohorts
  visibility: ReferenceVisibility;       // from PresentationContext
  defaultCohortType: string;             // from response.defaultByTheme
  onChange: (next: ReferenceVisibility) => void;
}
```

Renders:
- Cohort-type select dropdown (label: name of currently active cohort, showing member count e.g. "Woningmarktregio Amsterdam (28 gemeenten)").
- Three toggle chips: Cohort, Provincie, NL. Each toggles `referenceVisibility.cohort/provincie/land` on the active presentation.
- "Toon cohort leden" link → opens a side panel listing the gemeente codes in the active cohort, with their parent provincie. (Provenance: shows source + vintage from `CohortMembership.source`.)

### KpiStrip

```typescript
interface KpiStripProps {
  themeSlug: string;
  geoCode: string;
  geoLevel: GeoLevel;
}
```

Renders 4–6 NumberDisplay tiles per theme. Tile selection driven by `theme_kpi_config` (a new column on `themes`, JSONB) — see Task 4. Each tile uses SPEC-B's NumberDisplay reference rendering (delta chips for vs-cohort and vs-NL).

Per-supercategory default KPI count: Wonen 6 (population, households, dwellings, shortage, new construction 5y, demolitions 5y); other supercategories start with 4.

### TileGrid (existing)

Unchanged. References render per SPEC-B inside each chart component. No drilldown-specific changes here.

## Routing & State

The route `/dashboard/:themeSlug` and (SPEC-D) `/p/:projectSlug/:themeSlug` resolve to the same `DashboardPage`. The page reads:

- `theme` from theme registry by slug.
- `presentation` (and therefore `filters.geoLevel`, `filters.geoCode`, `referenceVisibility`) from `PresentationContext`.
- `cohortMemberships` from `/api/cohorts/:gemeenteCode` (cached per gemeente in a React Query-style hook `useCohortMemberships`).

When `filters.geoLevel === 'gemeente'`, the gemeente-drilldown frame mounts. Otherwise the existing dashboard frame renders.

## Performance Considerations

- KPI strip: parallel `/api/data/query` per tile, each with `references=cohort,provincie,land`. ~6 requests in parallel — within fetch concurrency budget.
- Chart grid: each tile already debounced; references add no round-trips (SPEC-A bundled).
- `useCohortMemberships` cache: per-gemeente, in-memory + sessionStorage, TTL 1 h. Cohort memberships are yearly-stable; aggressive caching is safe.
- Skeleton loaders for header + KPI strip + each tile during fetch (no layout shift).

## Implementation Tasks

### Task 1 — `useCohortMemberships(geoCode)` hook
Wraps `/api/cohorts/:geoCode`. Returns `{ memberships, defaultByTheme, isLoading, error }`. SessionStorage cache TTL 1 h.

### Task 2 — `GemeenteHeader` component
Builds on existing `GeoHierarchy` for the picker. Pulls summary chips from cohort + bevolking endpoints. `aria-live` on change.

### Task 3 — `CohortToggles` component
Visibility toggles + cohort-type select + member-list panel.

### Task 4 — `theme_kpi_config` column
Migration `024a_theme_kpi_config.sql` (or fold into 024 cohort migration): `ALTER TABLE themes ADD COLUMN kpi_config JSONB DEFAULT '[]'`. Seed Wonen + Duurzaamheid theme rows with their KPI tile lists (data_source + dimension + label + delta_direction).

### Task 5 — `KpiStrip` component
Reads theme `kpi_config`. Renders one NumberDisplay per entry, parallel fetching, skeleton loaders. Reuses SPEC-B delta chip rendering.

### Task 6 — Extend `DashboardPage`
Mount the gemeente-drilldown frame conditionally on `filters.geoLevel === 'gemeente'`. Otherwise render existing layout. Keep change minimal — no refactor of TileGrid.

### Task 7 — Mobile responsiveness
Breakpoints at 640 px and 1024 px. KPI strip wraps; cohort toggles collapse into a single "Vergelijken" popover button.

### Task 8 — A11y pass
Keyboard-only navigation through GemeenteHeader → CohortToggles → KpiStrip → first chart tile. Screen reader test: announce focal change; describe each KPI delta in plain Dutch.

### Task 9 — Tests
- `useCohortMemberships`: cache hit/miss, TTL expiry, error handling.
- `GemeenteHeader`: render with gemeente vs non-gemeente focal; picker change emits.
- `CohortToggles`: visibility toggle propagates; cohort-type switch updates membership cache key.
- `KpiStrip`: renders N tiles for theme with N kpi_config entries; delta chip colour matches direction.
- Visual smoke: each Wonen theme + Duurzaamheid Overzicht for gemeente Amsterdam.

### Task 10 — Wonen KPI seed (content)
Seed `kpi_config` for the 5 existing Wonen themes. Out-of-scope: Duurzaamheid + future themes (handled when each ships its prebuilt dashboard).

## Validation Plan

1. Land on `/dashboard/wonen-overzicht` with focal gemeente Amsterdam → header, cohort toggles, KPI strip (6 cards), tile grid all visible inside 1.5 s.
2. Switch focal to Eindhoven via picker → header chips update; cohort active = "Woningmarktregio Eindhoven"; tiles re-render.
3. Switch cohort type to `populatiegrootte` → cohort label updates to "100k–250k inwoners"; KPI deltas recompute.
4. Toggle cohort off → cohort series + delta chip disappear in every tile + KPI card; provincie + NL remain.
5. Switch focal to NL via the level dropdown → cohort affordance hides; KPI strip still renders with vs-NL delta omitted (focal IS NL); tile grid unchanged.
6. Resize to 375 px width → mobile layout works; cohort affordance accessible via popover.
7. Keyboard-only navigation: Tab through every interactive element of the drilldown frame; screen reader announces focal change.
8. Run all DashboardPage tests + new component tests; expect green.

## Files to Create/Modify

- `src/server/db/migrations/024a_theme_kpi_config.sql` — NEW (or fold into 024)
- `src/client/hooks/useCohortMemberships.ts` — NEW
- `src/client/components/dashboard/GemeenteHeader.tsx` — NEW
- `src/client/components/dashboard/CohortToggles.tsx` — NEW
- `src/client/components/dashboard/CohortMembersPanel.tsx` — NEW
- `src/client/components/dashboard/KpiStrip.tsx` — NEW
- `src/client/pages/DashboardPage.tsx` — conditional drilldown frame
- `src/server/db/seed.ts` — seed `kpi_config` for the 5 Wonen themes
- Tests for each new component + hook
- Visual smoke test seed for Wonen themes

## Non-Goals

- Project switcher / new-project wizard (SPEC-D).
- Per-tile cohort overrides at the chart layer (SPEC-B).
- Custom KPI dashboards (existing CustomDashboards remain unchanged; KPI strip here is theme-driven, not user-configurable).
- Forecast/prognose × KPI delta interaction (KPIs use latest-actual year by default; forecast comparisons are a future spec).
- Per-org KPI overrides (an org cannot replace the theme's default KPI list in v1).
