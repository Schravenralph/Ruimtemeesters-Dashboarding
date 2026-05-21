# Forge Spec: cohort/provincie/land references on time-series tiles

**Cycle:** 8 | **Clock:** 0h (fresh session day 2) | **Size:** medium

## What

Wire the existing `computeReferences` reference-aggregate pipeline through the time-series path so line-chart tiles render dashed cohort/provincie/landelijk lines alongside the focal-gemeente trend. Today the line tiles for Bedrijvigheid, Inkomen, Werkgelegenheid, Voertuigenpark, Criminaliteit, Hernieuwbaar etc. all say in their descriptions "vergelijking met cohort/provincie/landelijk volgt zodra de reference-pipeline aangesloten is" — that promise is unfulfilled because `/api/data/timeseries` doesn't call `computeReferences`.

## Why

Most of yesterday's freshly-shipped scaffolds are line tiles. Without references, the user sees Amsterdam's trend in isolation — no answer to "is this a lot or a little compared to similar gemeenten?". One backend change unlocks reference series on 10+ tiles immediately.

## Success criteria

1. `GET /api/data/timeseries?source=…&geoCode=GM0363&references=cohort,provincie,land` returns a `references` block with three full series.
2. On the live dev server, the Bedrijvigheid/Inkomen/Werkgelegenheid trend tiles render Amsterdam + cohort + provincie + Nederland as four lines.
3. No regression on the existing snapshot reference path.

## Approach

- **Server**: extend `queryTimeSeries` to accept `references` (+ optional `cohortType`) query params, mirroring `queryData`. Call `computeReferences(..., yearFilter: undefined)` so it returns the full per-year series, not a single-year aggregate. Return `{ data, references }`.
- **Client API**: `queryTimeSeries` return type gains `references?: ReferencesBlock`.
- **Hook**: `useTimeSeriesQuery` accepts a `references` option (the comma-joined param), exposes the block via return value.
- **DashboardTile**: when `isLineChart`, opt into references via the same `referenceVisibility` filter context used by snapshots. Pass the time-series block into `ChartRenderer`.

## Not doing

- Confidence envelopes on cohort/provincie/land (the percentile p25/p75 mode) — only the mean series. Envelopes are a separate cycle.
- Cohort-type override UI on the new themes — defaults to `populatiegrootte` for unknown supercategories. Economie/Mobiliteit/Veiligheid will use that default until a per-supercategory cohort policy is decided.
- Forecast-vintage references on TSA prognose series — references only show for `cbs_actuals` years.
