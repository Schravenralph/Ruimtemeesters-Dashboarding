# Forge Spec: In-dashboard "Update frequency" affordance (sync-demand UI)

**Cycle:** 11 (this session) | **Clock:** ~4.4 h elapsed | **Size:** small-medium

## What

UI for EPIC #108 child [#102](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/issues/102). Adds a "Updatefrequentie" dropdown to DashboardPage that lets an authenticated user request stricter sync cadence for the data sources the dashboard references. Submits one `POST /api/sync-demands` per distinct data source from the dashboard's tiles. Shows a brief "Verzoek ingediend" confirmation after submission.

## Why

Cycle 10 (PR #118) shipped `POST /api/sync-demands` + the aggregator service. Without a user-facing entry point, the endpoint is dead — users can't actually submit demands. This PR is the entry point.

Closes the sync-demand loop end-to-end (cycle 9 schema → cycle 10 aggregator → cycle 11 UI). Mirrors the cycle-11-update-from-theme pattern (cycle 2 backend → cycle 3 UI).

## Success criteria

| # | Criterion | Verification |
|---|---|---|
| 1 | "Updatefrequentie" dropdown visible on DashboardPage when authenticated and the dashboard has at least one data source | Manual smoke + conditional render in component |
| 2 | Dropdown options: Maandelijks (`0 6 1 * *`) / Wekelijks (`0 6 * * 1`) / Dagelijks (`0 6 * * *`) / Per uur (`0 * * * *`) | Unit test on the constant |
| 3 | Picking an option calls `POST /api/sync-demands` once per distinct data source the dashboard's tiles reference | Unit test on the helper that derives the list |
| 4 | After submission, dropdown shows a transient "✓ Verzoek ingediend voor N bronnen" status; auto-clears after 5 seconds | Manual smoke |
| 5 | Errors surface as a non-blocking inline error message | Manual smoke |
| 6 | Hidden when the dashboard has zero data sources (e.g. only narrative tiles) | Conditional render |

## Approach

- New `<SyncDemandPicker>` component in `src/client/components/dashboard/`.
- Pure helper `distinctDataSources(tiles: TileConfig[])` returns the array of source keys; unit-tested.
- Constants object `SYNC_DEMAND_PRESETS: Array<{ label: string; cron: string }>` for the 4 cadences.
- API client extension: `submitSyncDemand(dataSourceKey, requestedCron)` in a new `src/client/services/api/sync-demands.ts`.
- DashboardPage renders the picker in the button group next to "Bijwerken van thema". Picker handles its own state (submitting / success / error).
- No GET-current-effective-cron in this cycle — the picker is forward-looking. Showing the current effective cron requires a new endpoint that's out of scope.

## Not doing

- **Notifications when the sync actually runs** — EPIC #108 child #103.
- **Current-effective-cron read endpoint** — separate cycle if user testing demands it.
- **Per-tile granularity** — dashboard-level only for v1. ADR-006 explicitly leaves this open as a design call.
- **Configurable expiresInDays** — uses the default (14 days, server-side).
- **Auth-failed degradation** — if user is anonymous, the picker is hidden entirely.

## Baseline → Expected

| Metric | Before | After |
|---|---|---|
| User entry point for sync-demand submission | 0 | 1 dropdown on DashboardPage |
| Distinct cron presets exposed | 0 | 4 (monthly / weekly / daily / hourly) |
| Visible workflow: pick freq → demand submitted → confirmation | absent | present |
| Tests | 0 | ~5 (distinctDataSources helper + SYNC_DEMAND_PRESETS shape) |
