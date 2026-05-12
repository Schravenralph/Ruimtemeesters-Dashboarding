# Forge Spec: Sync subscriber notifications

**Cycle:** 1 | **Clock:** 0h elapsed | **Size:** medium

## What

Notify `sync_subscribers` when a sync_run completes (`data_arrived`) or when an aggregator-driven cron change is applied to `sync_schedules` (`frequency_changed`). Honours each subscriber's `notification_pref` JSONB (`events`, `in_app`, `email`). Closes EPIC #108 child #103.

## Why

EPIC #108 ships an end-to-end demand loop: users picked a cadence via the in-dashboard "Updatefrequentie" picker (#119), the aggregator resolved it to a cron and mutated `sync_schedules` (#118), demands decay daily (#120), and admins see the active state (#121). Without notifications, the loop is silent — users never learn when the data they asked for actually arrives, or when an aggregator-applied frequency change took effect on their behalf. Notifications close that gap, so an advisor can submit a "Wekelijks" demand on Monday and get an in-app toast (and optional email) when Tuesday's run lands.

## Success criteria

1. After `sync_runs` completes for source X, every user-kind subscriber to X with `events` containing `'data_arrived'` receives an in-app notification (per `in_app`) and/or an email (per `email`).
2. After the aggregator applies a different `sync_schedules.cron` for source X (via `applyAggregationToSchedule`), every user-kind subscriber to X with `events` containing `'frequency_changed'` is notified the same way.
3. Schedule-owner notifications (existing `sync_schedules.notify_email`/`notify_in_app` path) do NOT double-fire for a recipient who is also a subscriber.
4. ≥4 unit tests covering: pref event filtering, in_app/email channel selection, dedup vs schedule-owner, no-op when subscriber list empty.

## Approach

- New `src/server/services/sync/subscriber-notifier.ts` with one entry point `notifySubscribers({ dataSourceKey, event, payload })`. Event is `'data_arrived' | 'frequency_changed'`. Payload carries the human-readable summary (rows inserted, new cron, source label).
- Reuses `createNotification` (in-app) and `getEmailService()` (email) — same shape as `cbs/sync-notifier.ts`.
- Hook A — sync-scheduler post-run: after the existing `notifySyncFinished` call in `sync-scheduler.ts`, invoke `notifySubscribers({ event: 'data_arrived' })`. Dedup: pass the recipient set already notified by the schedule path so subscriber path can skip them.
- Hook B — aggregator: in `aggregator.service.ts::applyAggregationToSchedule`, after the UPDATE, invoke `notifySubscribers({ event: 'frequency_changed' })` if the new cron differs from the previous one.
- Project-dashboard subscriber kind (`subscriber_kind='project_dashboard'`) resolves to all `project_members` of that dashboard's project (best-effort — if the project has no members, skip silently). v1 keeps user-kind as the primary path; project_dashboard is wired but not exercised by current UI.
- Templates: subjects in Dutch, matching `cbs/sync-notifier.ts` style (`[Dashboarding] Update beschikbaar: <Source>` / `Frequentie aangepast: <Source>`).

## Not doing

- No new migrations. `notification_pref` defaults already cover the desired behaviour.
- No `last_viewed_at` integration (ADR-006 mentions this for decay — out of scope here; covered by #120).
- No UI for managing subscriptions. Subscribers are auto-created on demand submit (existing #118 behaviour). v1 has no unsubscribe button.
- No retry / queue. If `createNotification` or `email.send` fails, log and continue — same posture as existing `cbs/sync-notifier.ts`.
- No new contract for the front-end. Notification dispatch is server-side only; the existing `/api/notifications` polling on the client already surfaces in-app notifications.
