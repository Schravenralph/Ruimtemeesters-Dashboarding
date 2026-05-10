# Reference-Series Rendering Across Chart Types

**Date:** 2026-05-09
**Status:** Approved
**Implements:** ADR-003 §"UI defaults"
**Depends on:** SPEC `2026-05-09-cohort-referential-data-design.md` (server returns `references` block)

## Summary

Render the cohort + provincie + land reference series on every Tier-1 chart type, on by default. Extends the existing single-comparison wiring (`FilterState.comparisonGeoCode`, `useComparisonQuery`, `FilterBar` "Vergelijken met") from one reference series to three simultaneous series, drawn on the same axis with consistent visual encoding.

## Success Criteria

| Metric | Threshold |
|--------|-----------|
| Tier-1 chart types rendering references by default | 8 (Line, Bar, StackedBar variant of Bar, ColorTable, ChoroplethMap, NumberDisplay, PercentageBar, HorizontalBarChart) |
| Tier-2 chart types — references opt-in or omitted (no breakage) | 17 remaining |
| Per-tile reference visibility persists per presentation tab | Stored in `Presentation.referenceVisibility` |
| Round-trips added per chart vs current | 0 (server returns `references` inline per SPEC-A) |
| Existing `comparisonLevel`/`comparisonGeoCode` continues to function | back-compat preserved |
| Visual encoding distinguishability | Cohort: dashed (8,4); Provincie: dashed (4,4); Land: dashed (2,2). All ~60 % opacity. Distinguishable without colour (a11y). |
| TypeScript | 0 errors (both tsconfigs) |
| Tests | Per Tier-1 chart type: snapshot with refs on, with refs off, with one ref hidden |

## Visual Encoding Standard

| Series | Stroke / Fill | Dash pattern | Opacity | Z-order |
|---|---|---|---|---|
| Focal gemeente | theme accent colour, 2 px solid | — | 1.0 | top |
| Cohort mean | neutral grey-700, 1.5 px | 8,4 | 0.65 | mid |
| Provincie mean | neutral grey-500, 1.5 px | 4,4 | 0.55 | mid |
| Land (NL) mean | neutral grey-400, 1.5 px | 2,2 | 0.50 | bottom |
| Cohort envelope (opt-in) | neutral grey-700, fill | — | 0.10 | bg |

KPI delta chips (NumberDisplay only): focal value as headline; below it, two chips:
- "vs cohort: +3.2 %" — green if directional-good, red if directional-bad, grey if neutral. Direction is per-tile config (e.g. woningtekort ↑ = bad; nieuwbouw ↑ = good).
- "vs NL: −1.8 %" — same colour rules.

## Per-Chart-Type Rendering Rules

| Chart | Reference rendering |
|---|---|
| **LineChart** | Each reference as a dashed line series on the same axis. Legend lists all 4 series. Hover tooltip shows all 4 values for the focused x-tick. |
| **BarChart (incl. stacked-bar)** | Focal as bar; refs as horizontal lines spanning the bar group at the reference value. Tooltip lists ref values. For stacked-bar: refs apply to the **total** bar height by default; per-segment ref opt-in via tile config. |
| **HorizontalBarChart** | Same as BarChart but vertical lines instead of horizontal. |
| **ColorTable** | Focal row pinned. Above the data rows, append 1–3 reference rows ("Cohort: Wmr Amsterdam", "Provincie: Noord-Holland", "Nederland") with the same cell colouring scale. Visually distinguished by italic + light grey row background. |
| **ChoroplethMap** | Focal gemeente outlined in 2 px theme accent. Cohort gemeenten outlined in 1 px dashed grey-700. Legend gains markers for cohort mean + national mean values. Provincie ref omitted on map (the parent polygon would dominate). |
| **NumberDisplay (KPI)** | Focal value as headline. Two delta chips below: "vs cohort" + "vs NL". Provincie chip available via tile config (off by default to keep the card clean). |
| **PercentageBar** | Reference markers as small triangles on the bar at the reference percentage. Tooltip on hover. |
| **Tier-2 chart types (Pie, Donut, Radar, Treemap, Sankey, Waterfall, Bubble, Gauge, PopulationPyramid, StackedArea, ComboChart, Heatmap, MapChart, PointMap, DataTable, BarChart variants beyond stacked, others)** | No default reference rendering. Tile config can opt in via `chartConfig.references = ['cohort', 'land']` — implementation deferred per chart type. |

## State Design

Extend `Presentation` (in `PresentationContext.tsx`):

```typescript
interface ReferenceVisibility {
  cohort: boolean;       // default true
  provincie: boolean;    // default true
  land: boolean;         // default true
  envelope: boolean;     // default false
  cohortType?: 'stedelijkheid' | 'populatiegrootte' | 'woningmarktregio' | 'krimp_anticipeer';
  // ↑ undefined = use the supercategory default from CohortMembershipsResponse.defaultByTheme
}

interface Presentation {
  // …existing fields
  referenceVisibility: ReferenceVisibility;
}
```

Default on tab creation: `{ cohort: true, provincie: true, land: true, envelope: false, cohortType: undefined }`.

## ReferenceSeries Contract

Add to `src/shared/api/contracts.ts` (alongside SPEC-A's `ReferencesBlock`):

```typescript
export const ReferenceSeries = z.object({
  kind: z.enum(['cohort', 'provincie', 'land']),
  label: z.string(),                     // human label for legend/tooltip
  series: z.array(SeriesPoint),
  envelope: z.object({                   // cohort only, optional
    p25: z.array(SeriesPoint),
    p50: z.array(SeriesPoint),
    p75: z.array(SeriesPoint),
  }).optional(),
});
export type ReferenceSeries = z.infer<typeof ReferenceSeries>;
```

The `useDataQuery` hook reads `presentation.referenceVisibility` to build the `references` query param, then projects the `references` block into a `ReferenceSeries[]` array passed as a chart prop.

## Component Contracts

Each Tier-1 chart gains an optional prop:

```typescript
interface ChartReferenceProps {
  references?: ReferenceSeries[];        // ordered: cohort, provincie, land
  // visual encoding constants centralised in src/client/utils/referenceSeries.ts
}
```

Charts that already receive `data` and a config object: add `references` as a sibling prop. The renderer (`ChartRenderer.tsx`) is the single place that subscribes to `referenceVisibility` and routes the prop.

A small UI affordance — `<ReferenceTogglesPopover>` — sits in the tile header (next to the existing tile menu). Renders three checkboxes (Cohort / Provincie / NL) + a select for cohort type. Hidden when chart is Tier-2 with no `references` config.

## Implementation Tasks

### Task 1 — Shared types + presentation state
Add `ReferenceSeries` Zod type. Extend `Presentation` interface with `referenceVisibility`. Update default-presentation factory. Migrate any persisted presentations gracefully (Zod `.default(...)` handles missing field).

### Task 2 — useDataQuery extension
When `presentation.referenceVisibility` has any series enabled, append `references=` query param. Project response `references` block into `ReferenceSeries[]`. Pass through to chart via existing `data` channel.

### Task 3 — ChartRenderer routing
Single switch on chart type → forward `references` prop only to Tier-1 components or Tier-2 components that opted in via tile config. No-op for unsupported types.

### Task 4 — Visual encoding utility
`src/client/utils/referenceSeries.ts` exports stroke/dash/opacity/z-order constants + helpers (`getReferenceStyle(kind)`, `getDeltaColour(direction, deltaPct)`).

### Task 5 — LineChart references
Render each non-empty reference series as a dashed `<Line>` (Recharts). Legend ordered: focal, cohort, provincie, land. Tooltip shows all 4 if present.

### Task 6 — BarChart + HorizontalBarChart references
For each bar group, render a `<ReferenceLine>` per active reference. Stacked variant: ref applies to total height by default; per-segment opt-in via `chartConfig.refTarget = 'segment' | 'total'`.

### Task 7 — ColorTable references
Append reference rows above data rows. Use existing cell-colouring scale. Light grey background + italic to distinguish.

### Task 8 — ChoroplethMap references
Outline focal in theme accent; outline cohort members dashed; add legend markers. Provincie ref omitted on map.

### Task 9 — NumberDisplay (KPI) delta chips
Render delta chips below the headline value. Direction config from tile (`chartConfig.deltaDirection: 'higher-is-good' | 'higher-is-bad' | 'neutral'`). Default: `'neutral'` (grey).

### Task 10 — PercentageBar reference markers
Triangle markers on the bar at reference percentages. Tooltip on hover.

### Task 11 — ReferenceTogglesPopover
Tile-header popover with three checkboxes + cohort-type select. Updates `presentation.referenceVisibility`. Hidden for Tier-2 charts.

### Task 12 — Tests
For each Tier-1 chart: snapshot with all refs on; snapshot with cohort hidden; snapshot with all refs off (verifies back-compat with no-references case). NumberDisplay: assert delta chip values + colours per direction config.

## Validation Plan

1. Open a Wonen → Bevolking dashboard for Amsterdam. Verify every Tier-1 tile shows cohort + provincie + land series by default.
2. Toggle cohort off in one tile via the popover → only that tile updates; other tiles unchanged.
3. Switch cohort type from `woningmarktregio` (Wonen default) to `populatiegrootte` → series re-renders with G4 cohort mean.
4. Open a Pie chart tile (Tier-2) → no references shown, no popover. Confirms graceful no-op.
5. Resize window mobile-narrow → reference legend still legible; tooltip still functional.
6. A11y check: focal series distinguishable from refs by dash pattern + opacity, not just colour. Test with high-contrast mode.
7. Run all chart-component tests; expect green.

## Files to Create/Modify

- `src/shared/api/contracts.ts` — `ReferenceSeries` Zod type
- `src/client/contexts/PresentationContext.tsx` — `referenceVisibility` state
- `src/client/hooks/useDataQuery.ts` — append `references` param, project `references` block
- `src/client/components/charts/ChartRenderer.tsx` — route prop
- `src/client/components/charts/LineChart.tsx`
- `src/client/components/charts/BarChart.tsx`
- `src/client/components/charts/HorizontalBarChart.tsx`
- `src/client/components/charts/ColorTable.tsx`
- `src/client/components/charts/ChoroplethMap.tsx`
- `src/client/components/charts/NumberDisplay.tsx`
- `src/client/components/charts/PercentageBar.tsx`
- `src/client/utils/referenceSeries.ts` — NEW (visual encoding constants)
- `src/client/components/dashboard/ReferenceTogglesPopover.tsx` — NEW
- Test files for each modified chart

## Non-Goals

- Tier-2 chart-type reference rendering (deferred; opt-in possible via tile config but not implemented here).
- Cohort definition/curation UI (covered by SPEC-A admin surface).
- Per-segment references on stacked-bar (config supported; implementation deferred).
- Forecast/prognose × reference interaction (specced in SPEC-C if needed; for now refs apply to actuals only).
