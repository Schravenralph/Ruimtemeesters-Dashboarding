---
name: Print view respects filter context
description: Wire /print/:slug to read geoCode/year from URL params and add a Print button to DashboardPage that passes current filter state
---

# Forge Spec: Print view respects filter context

**Cycle:** 2 | **Clock:** 0.2h elapsed | **Size:** medium

## What
- `PrintPage` reads `geoCode` and `year` from URL search params and passes them into every `queryData` call.
- Print header shows the resolved geo name (gemeente / provincie / NL) and the selected year.
- `DashboardPage` gets a new "Print" button that opens `/print/:slug?geoCode=X&year=Y` in a new tab using the currently-active filters.

## Why
`/print/:slug` exists but is unreachable from the UI and always renders default NL/2024 data because it ignores filters. An advisor who wants a printable version of a themed dashboard for, say, Gemeente Amsterdam 2024 has no way to get it. Dead route meets dead-end user journey.

## Success criteria
1. Opening `/print/bevolking-overzicht?geoCode=GM0363&year=2024` renders Amsterdam data (verified via data in the chart rendering).
2. Header shows "Gemeente Amsterdam · 2024".
3. Clicking the new "Print" button on a theme dashboard opens the print view in a new tab with the active filters.

## Approach
- `PrintPage`: `useSearchParams()` → geoCode/year. Pass into `queryData`. Fetch geo name via `getArea(geoCode)` and render in header.
- `DashboardPage`: add "Print" button (Printer icon) near the PDF button. Handler: `window.open('/print/' + theme.slug + '?geoCode=' + filters.geoCode + '&year=' + filters.period.year, '_blank')`.

## Not doing
- Not adding prognose year support to print (separate concern; queryData defaults to latest actual).
- Not adding multi-geo print (single geoCode only).
- Not changing the auto-print timer behavior.
