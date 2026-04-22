---
Cycle: 1
Date: 2026-04-22
Size: small
---

# Forge Spec: Rapport page — inline year + compareYear picker

## What
The Rapport page today ships with a source picker only. The backend (`/api/reports/:source` + `/api/reports/:source/csv`) and the service layer fully support `compareYear` — deltas are computed per line item and on the grand total — but users can only set `compareYear` via `FilterBar` on a dashboard page. This cycle adds an inline "Vergelijken met" toggle and year dropdown on `ReportPage`, fetches available years per source, and surfaces the compare-year context in the header and section deltas.

## Why
Today a user who lands on `/rapport` cannot compare years without first visiting a different page — the Rapport workflow dead-ends at a single snapshot. Adding the picker inline completes the comparison loop that the backend was already wired for: pick source → pick year → pick compare year → read side-by-side deltas → export CSV with both years.

## Success criteria
1. ReportPage renders a `Jaar` dropdown populated from `/api/data/years/:source` (same endpoint `FilterBar` already uses).
2. Toggle "Vergelijk met" exposes a second dropdown that excludes the currently-selected year.
3. When a compareYear is active: the report header shows `— vergeleken met YYYY`, and Overzicht + breakdown deltas render next to each line (these already exist in state; the header line is new).
4. Changing year or compareYear in the Rapport page triggers a fresh report fetch.
5. CSV download already carries `compareYear` (already wired); verified unchanged.
6. Clearing the toggle returns the page to single-year mode.

## Approach
- Keep `useFilters()` as the source of truth (so PresentationContext stays consistent if the user tabs between Rapport and Dashboard).
- Add a local `useEffect` to fetch years for the active `source` (fallback to a sensible default set if API fails).
- Wire two new `<Select>` components wrapping `setYear` / `setCompareYear` from context.
- Add a subtitle line under the report header that shows the compare year when active, plus overall % change next to the grand-total value.

## Not doing
- No changes to `report.service.ts` or routes.
- No changes to CSV format.
- No trend chart shape changes — the chart still covers 10 actuals + 5 prognose years regardless of compareYear.
- No multi-source compare or compare-geo in this cycle.
