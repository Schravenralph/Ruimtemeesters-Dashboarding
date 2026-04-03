# Dimension Comparison Mode

## Summary
Allow users to select 2-4 dimension values and compare them as overlaid series on charts. E.g., compare age groups "0-14" vs "65-74" vs "75+" over time, or "koopwoningen" vs "huurwoningen" side-by-side.

## Success Criteria
| Metric | Threshold |
|--------|-----------|
| Comparison axes supported | 3 (period, area, **dimension**) |
| Max selectable dimension values | 4 |
| Charts supporting dimension comparison | Line, Bar, StackedBar |
| API round-trips for dimension comparison | 1 (client-side split) |
| No regression: existing period/area comparison | Still works unchanged |
| TypeScript | 0 errors (both tsconfigs) |
| Tests | All existing pass + new tests for comparison logic |

## State Design
Add to `FilterState` in `contracts.ts`:
```typescript
comparedDimensionValues: z.array(z.string()).default([]),
```

When `comparedDimensionValues` has 2+ entries:
- Charts render one series per selected value
- Data is fetched WITHOUT dimensionValue filter (get all), then filtered client-side
- Unselected values are hidden

When empty: normal behavior (no dimension comparison).

## Implementation Tasks

### Task 1: Extend FilterState + FilterContext
- Add `comparedDimensionValues: string[]` to FilterState schema
- Add `setComparedDimensionValues` setter to FilterContext
- Update defaultFilters in both FilterContext and PresentationContext

### Task 2: Dimension comparison selector UI
- New `DimensionComparisonSelector` component
- Shows available dimensions for current data source (reuse getDimensions API)
- Chip-based multi-select for dimension values (max 4)
- Color indicators matching chart series colors
- "Wis vergelijking" (clear) button
- Placed in FilterBar below existing comparison controls

### Task 3: Update ChartRenderer to pass comparison data
- When `comparedDimensionValues.length >= 2`: fetch data without dimensionValue filter
- Filter client-side to only include selected values
- Pass filtered data to chart components

### Task 4: Update LineChart for dimension comparison
- Already handles multi-series via dimensionValues — verify it works with filtered subset
- Add legend showing selected dimension values with matching colors
- Ensure prognose/actuals split still works per dimension value

### Task 5: Update BarChart for dimension comparison
- Render grouped bars: one bar per dimension value per year/geo
- Color-code by dimension value
- Legend with dimension value labels

### Task 6: DimensionComparisonTable component
- Sortable table: rows = years, columns = selected dimension values + delta
- Shows absolute values and % change between first two selected values
- Reuse ComparisonTable patterns

### Task 7: Integration test
- Test: select 2 dimension values → chart renders 2 series
- Test: select 4 → chart renders 4
- Test: clear → back to normal
- Test: coexists with period comparison

## Validation Plan
1. Select "Bevolking" theme, pick dimension "Leeftijdsgroep"
2. Compare "0 tot 15 jaar" vs "65 tot 75 jaar" → line chart shows 2 colored lines
3. Add "75 jaar of ouder" → 3 lines
4. Enable period comparison simultaneously → still works
5. Switch to bar chart → grouped bars per dimension value
6. Clear comparison → back to single series

## Files to Create/Modify
- `src/shared/api/contracts.ts` — FilterState extension
- `src/client/contexts/FilterContext.tsx` — new setter
- `src/client/contexts/PresentationContext.tsx` — default
- `src/client/components/filters/DimensionComparisonSelector.tsx` — NEW
- `src/client/components/filters/FilterBar.tsx` — integrate selector
- `src/client/components/charts/ChartRenderer.tsx` — data filtering logic
- `src/client/components/charts/LineChart.tsx` — verify/enhance
- `src/client/components/charts/BarChart.tsx` — grouped bars
- `src/client/components/dashboard/DimensionComparisonTable.tsx` — NEW
