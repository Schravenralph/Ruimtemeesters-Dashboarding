# Forge Report — 2026-04-15

**Wall clock:** 0.4h
**Cycles completed:** 8 (12 incl. prior session state)
**Features shipped:** 8 merged, 0 pending review

## Shipped Features

| # | Feature | PR | Status | Size |
|---|---------|------|--------|------|
| 1 | Line chart tiles use time series with prognose | #9 | merged | M |
| 2 | Prognose year labels in filter dropdowns + tile badge | #10 | merged | S |
| 3 | Overview sparklines show prognose as dashed purple tail | #11 | merged | S |
| 4 | Gemeente comparison panel — G4 side-by-side trends | #12 | merged | M |
| 5 | TrendSummary + line tiles work for all data sources | #13 | merged | S |
| 6 | Top groeiers ranked list + comparison API route | #14 | merged | M |
| 7 | Prognose metadata banner + /data/prognose-meta endpoint | #15 | merged | S |
| 8 | CBS data attribution footer + TSA disclaimer | #16 | merged | S |

## Impact

### New use cases enabled
- Users can compare population trends of up to 6 gemeenten side-by-side (G4 pre-selected)
- Users see ranked lists of fastest-growing and fastest-shrinking gemeenten
- Users get prognose metadata (7 models, 538 gemeenten, last run date) on the Prognose theme

### Existing UX enriched
- Line chart tiles now show full 37-year history + TSA prognose with confidence bands (was single data point)
- Overview sparklines show two-tone actuals/prognose tail (was flat single color)
- Year dropdown marks "(prognose)" for future years
- Non-line-chart tiles show purple "prognose" badge when viewing forecast years
- TrendSummary works for energie, hernieuwbaar, afval (was broken — hardcoded bevolking dimension)
- Legal: CBS CC-BY 4.0 attribution and AI forecast disclaimer on every page

### Infrastructure expanded
- `/api/comparison/areas` endpoint exposes area comparison service
- `/api/data/prognose-meta` endpoint returns TSA forecast metadata

## Unfinished / Next Session

| Priority | Feature | Why | Est. size |
|----------|---------|-----|-----------|
| 1 | Duurzaamheid overzicht fix | Shows wonen StatsSummary instead of energie stats — is_overview=true triggers wrong content | M |
| 2 | Re-run TSA with years_ahead=6 | Recent run overwrote 2025-2030 with years_ahead=1 — need full 6-year forecasts back | S |
| 3 | Confidence band tooltip enhancement | Hovering confidence area should show "95% CI: 878K – 1.05M" | S |
| 4 | Print/PDF prognose rendering | Verify /print/:slug route renders prognose charts correctly | S |
| 5 | Custom dashboard with prognose tiles | Let users drag prognose tiles into custom dashboards | M |

## Observations
- Cycles averaged ~3 min each — very fast due to small, focused scope and zero test failures
- The biggest unlock was cycle 1 (line chart time series) — everything else built on that foundation
- The dimension hardcoding bug (cycle 5) was a silent failure — themes loaded but showed empty charts
- CBS attribution was legally required and was missing from the entire application
