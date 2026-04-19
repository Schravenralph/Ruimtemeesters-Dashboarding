---
name: Duurzaamheid QuickInsights
description: Extend /api/insights with ?category=duurzaamheid returning CO2/energie/zonnepanelen/afval insights, and render QuickInsights on the duurzaamheid overview
---

# Forge Spec: Duurzaamheid QuickInsights

**Cycle:** 5 | **Clock:** 0.4h elapsed | **Size:** medium

## What
- `/api/insights` accepts `?category=duurzaamheid` and returns 4-5 data-driven sustainability insights (CO2 trend, zonnepanelen growth, afvalscheiding, energieverbruik woningen trend).
- `QuickInsights` component accepts optional `category` prop and passes it through.
- `DashboardPage` renders `<QuickInsights category="duurzaamheid" />` on the duurzaamheid overview.

## Why
Wonen overview gets a "Snelle inzichten" block with auto-generated stories ("Nederland groeit naar 19.5M in 2060", "Vergrijzing: 20.5% is 65+"). Duurzaamheid overview gets nothing — advisors have to read the charts themselves to find the story. Asymmetric UX.

## Success criteria
1. `curl /api/insights?category=duurzaamheid` returns ≥3 insights with real numbers.
2. Duurzaamheid overview page renders the insights block under the KPI strip.
3. Existing `/api/insights` (no category) behavior unchanged — wonen insights still work.

## Approach
- Split `getInsights` controller: read `category` query param; if `duurzaamheid`, run a separate set of queries; otherwise run the existing wonen queries.
- Insight queries: CO2 % change 2015→latest, zonnepaneel aantal groei, afvalscheiding %, energieverbruik woningen % change.
- Frontend: `QuickInsights` gains `category?: 'duurzaamheid' | 'wonen'` prop, passed to api.get.
- DashboardPage drops the `theme.supercategory !== 'duurzaamheid'` guard for QuickInsights, and passes the supercategory through.

## Not doing
- Not deduping the insight generation into a unified rule engine.
- Not persisting insights (they re-compute per request — fine for now).
- Not adding links back to specific duurzaamheid charts (keep simple — render title/description/value only).
