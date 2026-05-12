# Forge Spec: Sync-demand aggregator service + POST /api/sync-demands

**Cycle:** 10 (this session) | **Clock:** ~4.1 h elapsed | **Size:** medium

## What

Backend implementation of EPIC #108 child [#101](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/issues/101). Adds:

- `src/server/services/sync/aggregator.service.ts` — `aggregate(dataSourceKey)` that pulls non-expired `sync_demand_requests` for the source, picks the strictest cron, applies the `data_sources.max_frequency_cron` cap, and updates the single `sync_schedules` row. Returns the effective cron + whether anything changed. Pure cron-comparator helper exported for unit testing.
- `POST /api/sync-demands` — authenticated user submits a `(dataSourceKey, requestedCron, dashboardContext?, expiresInDays?)` body; the controller inserts a `sync_demand_requests` row + auto-subscribes the user (per ADR-006) + calls the aggregator + returns the new effective cron.
- Zod request contract `SyncDemandRequestPost`.
- 6-8 unit tests covering the cron comparator (most-strict-wins) and cap behaviour (under-cap, at-cap, over-cap).

## Why

PR #116 shipped the sync-demand schema but no service consumes it. Without the aggregator, demand requests are dead writes — `sync_schedules` never gets touched. This PR closes that gap: a real demand request flows end-to-end into a frequency change.

UI (#102 in-dashboard affordance) and notifications (#103) follow in separate cycles. Backend-first keeps the PR reviewable and lets curl-level validation happen immediately.

## Success criteria

| # | Criterion | Verification |
|---|---|---|
| 1 | Pure `compareCronStrictness(a, b)` returns negative/zero/positive matching cron interval-shortness | Unit tests |
| 2 | `aggregate('bevolking')` with no active demands resets `sync_schedules.cron_expression` to the baseline (admin-defined) | Integration test against dev DB |
| 3 | `aggregate('bevolking')` with one demand `0 6 * * *` updates `sync_schedules.cron_expression` to `0 6 * * *` | Integration test |
| 4 | `aggregate('bevolking')` with two competing demands picks the strictest | Integration test |
| 5 | `aggregate('bevolking')` with a strict demand but a stricter `data_sources.max_frequency_cron` cap returns the CAP, not the demand | Integration test |
| 6 | `POST /api/sync-demands` requires auth, validates body, inserts demand + subscriber, calls aggregator, returns `{ effectiveCron, changed: boolean }` | curl test |
| 7 | Global-pull invariant preserved: no `organization_id` reads or writes | Code review |

## Approach

### Cron comparator

The "strictest cron" = the one that fires most often. For deterministic comparison without a full cron parser, derive an interval signature per cron expression. For the common 5-field cases:

- `*/5 * * * *` → 5 minutes
- `0 * * * *` → 60 minutes
- `0 6 * * *` → 1440 minutes (daily at 06:00)
- `0 6 * * 1` → 10080 minutes (weekly Monday at 06:00)
- `0 6 1 * *` → 43200 minutes (monthly day-1 at 06:00, approx)

Use the `cron-parser` npm package if already installed, else use a small helper that handles the half-dozen patterns we use today. The helper produces a "next-fire-interval-minutes" approximation; the comparator just numeric-compares those.

Check what's available first — fall back to inline helper if needed.

### Aggregator

```ts
export async function aggregate(dataSourceKey: string): Promise<{
  effectiveCron: string;
  changed: boolean;
  appliedDemandCount: number;
  cappedAt: string | null;  // cap value if active demand exceeded cap
}>
```

Single transaction:
1. SELECT FOR UPDATE the `sync_schedules` row for the data source.
2. SELECT non-expired `sync_demand_requests` where `data_source_key = $1`.
3. If empty: target = `sync_schedules.cron_expression` (existing baseline). Used to be set by admin; not changing here.
4. If non-empty: target = strictest demand. Then apply cap: if `data_sources.max_frequency_cron` exists AND demand-target is stricter than the cap, target = cap.
5. UPDATE `sync_schedules.cron_expression` to target IFF it differs from current. Set `changed = true`.
6. COMMIT.

Note: when there are no demands but there's an existing schedule, we DON'T mutate the schedule. The baseline cron is preserved. The aggregator only changes things in response to demands or expiry.

### POST /api/sync-demands

```
Body: { dataSourceKey, requestedCron, dashboardContext?, expiresInDays? }
Auth: authenticated user (any role)
Behaviour:
  1. Validate body via Zod.
  2. INSERT sync_demand_requests row (expires_at = NOW() + (expiresInDays ?? 14) days).
  3. UPSERT sync_subscribers (subscriber_kind='user', subscriber_id=user.id, data_source_key) — auto-subscribe.
  4. Call aggregate(dataSourceKey).
  5. Return { demand: {...}, effectiveCron, changed }.
```

No org check. Global-pull invariant.

### Tests

Pure unit tests for the cron comparator (5-6 cases). Integration tests for the aggregator that hit the dev DB — these don't run in CI today (no test DB harness) but the developer can run them locally. Structure them so they CAN run in CI later.

## Not doing

- **UI** — that's EPIC #108 child #102, separate cycle.
- **Notification delivery** — #103, separate cycle.
- **Demand decay job** — #104, separate cycle. The aggregator handles "what to do" but a cron isn't wired to call it on schedule. Manual trigger only for v1.
- **Admin view** — #105, separate cycle.
- **Full cron-expression parser** — using the half-dozen patterns we actually use today. If a user submits an exotic cron, the comparator falls back to a sane default ordering or rejects.
- **Cost telemetry** — out of scope for v1.

## Baseline → Expected

| Metric | Before | After |
|---|---|---|
| Demand requests with downstream effect on sync_schedules | 0 (writes are dead) | All non-expired demands → effective cron |
| POST /api/sync-demands endpoint | absent | live, auth-gated, returns effectiveCron |
| Aggregator service code | absent | one service module with pure helper + DB transaction |
| Tests on most-strict-wins logic | 0 | 6-8 unit tests |
