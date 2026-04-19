---
name: Rapport trend chart shows prognose tail
description: Extend the Rapport trend chart to split actuals from prognose and render the future as a dashed purple line
---

# Forge Spec: Rapport trend chart — prognose tail

**Cycle:** 6 | **Clock:** 0.5h elapsed | **Size:** medium

## What
- Backend: `/api/stats/timeseries/:source` returns `source` alongside year/value so the client can distinguish actuals from prognose.
- Frontend: Rapport trend chart windows the timeseries to the last 10 actual years + up to 5 prognose years, rendering the prognose segment as a dashed purple line.

## Why
The trend chart from cycle 4 calls `.slice(-10)` on the full timeseries — for bevolking that returns pure prognose (2051–2060) instead of a sensible recent window. Advisors see a misleading chart. This cycle both fixes the windowing bug and adds a forward-looking tail that matches the existing pattern used in sparklines (#11).

## Success criteria
1. `curl /api/stats/timeseries/bevolking?geoCode=NL | jq '.timeSeries[0]'` includes a `source` string.
2. Rapport /rapport?source=bevolking shows a chart from roughly 2015 to 2030 with a visible dashed purple segment after the selected year.
3. Sources without prognose (e.g. afval, woningtekort) still render cleanly as a single solid line.

## Approach
- Change the controller to `SELECT year, value as total, source` and include source in the JSON response.
- Client: partition the series on `source === 'cbs_actuals'`. Render two `<Line>` components — solid blue for actuals, dashed purple for prognose. Keep the last 10 actuals + first 5 prognose years.

## Not doing
- Not touching the report.service.ts SOURCE_CONFIGS (report body stays snapshot-per-year).
- Not rendering confidence bands.
- Not extending other charts in the app — just the Rapport trend chart.
