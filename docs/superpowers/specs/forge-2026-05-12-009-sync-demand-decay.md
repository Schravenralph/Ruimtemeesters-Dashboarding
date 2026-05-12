# Forge Spec: Sync demand decay job

**Cycle:** 12 (this session) | **Clock:** ~4.6 h elapsed | **Size:** small

## What

EPIC #108 child [#104](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/issues/104). Daily node-cron job that re-runs the sync-demand aggregator for every data_source with outstanding demand rows, so `sync_schedules` relaxes back to baseline when demands naturally expire. Also reaps long-expired rows for storage hygiene.

## Why

Cycle 10's aggregator filters `WHERE expires_at > NOW()`. So when demands naturally expire (default TTL 14 days), the aggregator's *next* call returns a different result — but nothing triggers that next call. Without this decay job, `sync_schedules` stays at whatever value the last user-driven aggregation set it to, even after all demands have expired. The schedule never relaxes.

This closes that hole: a cheap daily cron re-aggregates per source, restoring baseline when there are no active demands. Also reaps storage waste from expired rows older than 30 days.

## Success criteria

| # | Criterion | Verification |
|---|---|---|
| 1 | `runDecay()` calls `aggregate()` once per data_source_key that has at least one row in `sync_demand_requests` (regardless of expiration status) | Unit test on a stubbed aggregator |
| 2 | `runDecay()` DELETEs rows where `expires_at < NOW() - INTERVAL '30 days'` | Integration test |
| 3 | Cron job registered on server boot, fires at 03:00 in the configured timezone | Manual smoke (server start logs) |
| 4 | `stopSyncDecayRunner()` removes the registered job for graceful shutdown | Unit test on the lifecycle |
| 5 | Server build + suite stay green | `pnpm build:server && pnpm vitest run` |

## Approach

- New `src/server/services/sync/decay-runner.ts`:
  - `runDecay()` — pure orchestrator. SELECT distinct data_source_keys with demand rows. Call `aggregate(key)` for each. DELETE long-expired rows. Returns `{ keysProcessed: number, rowsReaped: number }`.
  - `startSyncDecayRunner()` / `stopSyncDecayRunner()` lifecycle matching the existing `sync-scheduler` idiom.
  - Default cron `'0 3 * * *'` (daily at 03:00). Override via env `SYNC_DEMAND_DECAY_CRON`.
- Wire into `src/server/index.ts`: start on boot alongside the existing sync scheduler, stop on shutdown.
- Unit test the orchestrator with a stubbed `aggregate` to verify it iterates correctly.

## Not doing

- **Inactivity-based decay** (decay tied to dashboard not-viewed). ADR-006 listed this; needs a `last_viewed_at` signal on `project_dashboards` that doesn't exist today. The TTL-based decay (via `expires_at`) is sufficient for v1 and what's actually written.
- **Notification on decay event** (e.g. "your demand expired"). Out of v1 scope.
- **Admin trigger UI**. The cron runs autonomously; admins can run aggregator manually via the future admin view (#105).
- **Configurable reap window**. Hardcoded 30 days post-expiry.
