---
name: Rapport trend chart confidence band
description: Render the 95% CI as a shaded area behind the prognose line for sources with TSA forecasts
---

# Forge Spec: Rapport trend confidence band

**Cycle:** 8 | **Clock:** 0.7h elapsed | **Size:** small

## What
- Backend: `/api/stats/timeseries/:source` returns `confidenceLower` and `confidenceUpper` for rows that have them (TSA `ruimtemeesters_prognose` data).
- Frontend: Rapport trend chart draws a shaded purple `<Area>` behind the prognose line showing the 95% CI, and the tooltip shows the band bounds when present.

## Why
The prognose tail added in cycle 6 shows a point estimate but no uncertainty. TSA forecasts have real 95% bounds already in the DB (18K gemeente-level rows) — surfacing them turns the forecast line from "this will happen" into "this is the estimate with an uncertainty envelope", which is how advisors should actually read it.

## Success criteria
1. `/api/stats/timeseries/bevolking?geoCode=GM0363` returns `confidenceLower` / `confidenceUpper` for the prognose years.
2. Rapport for a gemeente with TSA data renders a shaded band behind the dashed prognose line.
3. Tooltip shows `95% CI: X – Y` when the band is present.
4. Sources without CI (NL-level cbs_prognose, afval, etc.) still render the solid+dashed chart cleanly without any band.

## Approach
- Add `confidence_lower as "confidenceLower"` / `confidence_upper as "confidenceUpper"` to the ranked CTEs and the outer SELECT.
- Map into the response object when non-null.
- Client: include `ci: [lower, upper]` tuples on chart rows when both values exist; feed into a recharts `<Area dataKey="ci">`.

## Not doing
- Not adding CI to the DashboardPage line charts (they already have it).
- Not adding CI for duurzaamheid (no TSA forecasts yet).
- Not showing numeric CI in the data rows, only in the tooltip.
