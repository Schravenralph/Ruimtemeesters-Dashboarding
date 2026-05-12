# Forge Spec: Admin view — active sync demands per data_source

**Cycle:** 13 (this session) | **Clock:** ~4.8 h elapsed | **Size:** small

## What

EPIC #108 child [#105](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/issues/105). Adds:

- `GET /api/admin/sync-demands` — admin-only — returns one row per data_source that has at least one demand row, with: `dataSourceKey, name, activeDemandCount, expiredDemandCount, strictestActiveCron, currentScheduleCron, maxFrequencyCron, oldestExpiry`.
- `<SyncDemandsAdmin>` component with a table.
- New "Sync demand" tab in AdminPage.

## Why

After cycles 10-12, sync demands are submittable + aggregated + decayed daily — but admins have no surface to see them. Without visibility, the cost-guardrail (max_frequency_cron) is hard to set rationally. This view closes that gap.

Mirrors the cycle-4 ThemeReadiness pattern exactly: read-only aggregate query → admin table → summary chips.

## Success criteria

| # | Criterion | Verification |
|---|---|---|
| 1 | `GET /api/admin/sync-demands` requires admin role | curl with non-admin returns 403 |
| 2 | Response shape matches `SyncDemandsAdminResponse` Zod | Type check |
| 3 | Returns one row per data_source with any demand row | SQL verification |
| 4 | New AdminPage tab "Sync demand" renders the table | Manual smoke |
| 5 | Build + suite stay green | `pnpm vitest run` |

## Approach

- One SQL aggregate joining `data_sources` ← `sync_demand_requests` ← `sync_schedules` (LEFT joins on the latter so empty schedules don't drop rows).
- Backend in a new `sync-demand.controller.ts` (or extend the existing controller — extend, since the file is small).
- Frontend follows the `ThemeReadiness` shape: 1 fetch, error/loading state, table with summary chip strip.

## Not doing

- **Per-demand drilldown** (who requested, when, dashboard_context). Aggregate view in v1; per-row drilldown is a future cycle.
- **Override / cancel demands from this view.** Read-only. Future feature if abuse pattern emerges.
- **Live updates / polling.** Page refresh sufficient.
