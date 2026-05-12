# ADR-006: Sync-demand subscriber model

## Status
Accepted — 2026-05-12

## Context

Today `sync_schedules` (migration 019) is **admin-only**. The only org-scoped knob is `data_source_subscriptions.sync_enabled` (per-org viewing toggle, no frequency input). End users have no way to express "I want this data refreshed more often" — they have to ask an admin, and admins have to manually bump a cron.

This is friction for two reasons:

1. **Stale data lands in user-visible places** (dashboard tiles, KPI strips, prebuilt themes) and users have no recourse.
2. **The cycle-11 update-from-theme pattern** (PRs #110/#111) already established a precedent for in-app, subscriber-style propagation — but only on the *content* axis (theme template versions). The *data* axis (sync frequency) is the missing sibling.

On 2026-05-12 the user (product owner) chose the coordination model via AskUserQuestion: **"Most-strict-wins (no approval), capped per data_source"** — over "Propose → admin approves" and "Auto-bump on threshold". Cost risk was acknowledged and explicitly mitigated by the cap + a demand-decay job.

## Decision

**A `sync_demand_requests` table records user-initiated demand for a given (data_source, cron) pair. An aggregator picks the most-strict cron across non-expired demands, capped by `data_sources.max_frequency_cron`, and mutates the single GLOBAL `sync_schedules` row.**

### Coordination model

1. Any authenticated user submits a demand request for `(data_source_key, requested_cron, dashboard_context)`.
2. The aggregator runs (synchronously on insert + nightly via decay job) to recompute the **effective cron** for that data source:
   - Collect all non-expired demands for the data_source.
   - Pick the strictest cron (smallest interval = most-strict).
   - Bound by `data_sources.max_frequency_cron` (admin-set; NULL = no cap, use system default).
   - If no active demands: fall back to the baseline cron originally set on `sync_schedules` (admin-defined).
3. Mutate the single `sync_schedules` row for the data_source. Emit a `frequency_changed` event for subscribers.
4. Demand requests have a TTL — `expires_at` defaults to NOW() + 14 days. A daily decay job revisits demands tied to dashboards that haven't been viewed in N days and expires them, triggering re-aggregation.

### Invariant preserved

**Sync state remains global.** No `org_id` is added to `sync_demand_requests`, `sync_subscribers`, or `data_sources.max_frequency_cron`. Per the project memory rule (`project_data_pull_vs_view.md`): pulls are global, viewing is per-org. A user's demand request elevates the GLOBAL schedule — other orgs benefit automatically. This is the intended behaviour, not a side effect.

### Subscribers

A separate `sync_subscribers` table tracks who/what should be notified on sync events:

- `subscriber_kind`: `'user'` or `'project_dashboard'`
- `subscriber_id`: UUID of the user or project_dashboard row
- `data_source_key`: the data source they care about
- `notification_pref`: `{ in_app: bool, email: bool, events: ['data_arrived', 'frequency_changed'] }`

Subscriptions can be created **implicitly** (when a user submits a demand request, they're auto-subscribed to changes for that data_source) and **explicitly** (via an opt-in toggle on dashboards or tiles — out of v1 scope).

### Cost narrative

Most-strict-wins is the riskiest UX choice for cost. Acceptable because:

1. **Hard per-source cap** (`data_sources.max_frequency_cron`). Admin sets the floor — e.g. CBS sources cap at daily even if a user requests hourly.
2. **Demand decay** on dashboard inactivity. No zombie demands holding the schedule strict forever.
3. **Admin visibility** (EPIC #108 #105 — admin panel). Spot abuse and adjust caps.

A future v2 may add per-org demand budgets if cost telemetry shows runaway. Out of v1 scope per the user's choice.

### Schema (migrations 031–033)

```sql
-- 031: sync_demand_requests
CREATE TABLE sync_demand_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_key   VARCHAR(255) NOT NULL REFERENCES data_sources(key),
  requested_cron    VARCHAR(255) NOT NULL,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dashboard_context JSONB,
  expires_at        TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- NO organization_id column. Per project_data_pull_vs_view.
);

-- 032: sync_subscribers
CREATE TABLE sync_subscribers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_kind   VARCHAR(20) NOT NULL CHECK (subscriber_kind IN ('user', 'project_dashboard')),
  subscriber_id     UUID NOT NULL,
  data_source_key   VARCHAR(255) NOT NULL REFERENCES data_sources(key),
  notification_pref JSONB NOT NULL DEFAULT '{"in_app": true, "email": false, "events": ["data_arrived","frequency_changed"]}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (subscriber_kind, subscriber_id, data_source_key)
);

-- 033: max_frequency_cron cap on data_sources
ALTER TABLE data_sources
  ADD COLUMN max_frequency_cron VARCHAR(255);  -- NULL = no cap
```

The aggregator service + endpoints + UI follow in EPIC #108 children #101-#105 (separate PRs).

### What is NOT in this ADR

- **Aggregator service implementation** — EPIC #108 child #101.
- **In-dashboard "Update frequency" affordance** — child #102.
- **Notification delivery** (in-app toast, email) — child #103. Hooks into existing `sync_schedules.notify_email` + `notify_in_app`.
- **Demand decay job** (cron, default N=14 days) — child #104.
- **Admin view of active demands** — child #105.
- **Per-org demand budgets** — deferred to v2 (user explicitly chose to skip in 2026-05-12 session).
- **Approval workflows** — explicitly rejected (most-strict-wins).
- **Cross-source cost attribution** — out of scope.

## Consequences

**Positive:**
- Users can express demand without admin intervention; admin time freed for substantive work.
- Global pull invariant preserved — no fleet fragmentation.
- Mirrors the cycle-11 subscriber pattern on the data axis (template content → frequency); shared vocabulary in code review and docs.
- Cost ceiling is data; admin can adjust without code changes.

**Negative / accepted trade-offs:**
- User submits a request and another user gets the strictness benefit — fine in our usage pattern (govs share data interests within a theme), but means cost is socialised across orgs.
- Most-strict-wins can be surprising if one power-user demands hourly across many sources. Mitigated by per-source caps + decay.
- The aggregator + notification machinery adds runtime complexity. Acceptable — it's a documented service with single-responsibility.

**Implementation impact (sequenced):**

1. ADR + migrations 031-033 (this PR).
2. Aggregator service (child #101).
3. Endpoints `POST /api/sync-demands` + admin view (children #105, #102).
4. UI affordance on DashboardPage (child #102).
5. Notifications (child #103).
6. Decay job (child #104).

## References

- `project_data_pull_vs_view.md` (memory) — global-pull invariant this ADR honours.
- `project_2026_05_12_subscriber_decisions.md` (memory) — captures the 2026-05-12 product call.
- ADR-004 — project bootstrap. Projects bound to data sources via subscriptions; demand requests can come from project dashboards.
- `docs/superpowers/specs/forge-2026-05-11-002-update-from-theme.md` — sibling subscriber pattern for theme content. Vocabulary aligned.
- Migration `019_sync_schedules.sql` — existing notify_email / notify_in_app columns reused.
- EPIC issue #108 — programme container for the implementation children.
