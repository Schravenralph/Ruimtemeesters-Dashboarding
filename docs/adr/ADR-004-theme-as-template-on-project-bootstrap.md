# ADR-004: Theme-as-template on project bootstrap

## Status
Accepted — 2026-05-09

## Context

Today an organization comes online via the `organizations` table (migration 001). Once an org exists, an admin must:

1. Subscribe the org to the relevant data sources via `data_source_subscriptions` (migration 016, manually or scripted).
2. Themes are global (`is_system = true`), so visibility-by-supercategory is the only org-level scoping.
3. Users land on the default theme via the post-login redirect (PR #55), but the dashboards they see are the seeded system tiles — not anything tied to a specific stakeholder ask.

This works for "an org wants the platform" but not for "an org runs multiple programmes and each programme is a context with its own focus, time horizon, and dashboards". A municipality typically has multiple parallel programmes — *Woonzorgvisie 2030*, *Klimaatadaptatie*, *Economische Visie* — each of which:

- Cares about a single theme (or a tightly-related cluster).
- Wants its own dashboards (so changes don't spill across programmes).
- Wants the relevant data sources to be subscribed without manual admin work.
- Wants a clear "we are looking at this from the Wonen lens" framing.

There is no entity in the schema today that represents a programme like this. `dashboard_templates` (migration 006) exists but is largely unused.

## Decision

**Introduce a first-class `Project` entity (many-per-org). Creating a project requires picking a theme. The pick auto-subscribes the org to the theme's data sources and clones the theme's prebuilt dashboards into the project.**

### Schema (sketch — exact DDL in the implementing TSD)

```
projects
  id              UUID PK
  organization_id UUID NOT NULL FK organizations(id)
  name            VARCHAR(255) NOT NULL    -- e.g. "Woonzorgvisie 2030"
  slug            VARCHAR(255) NOT NULL    -- unique within org
  theme_slug      VARCHAR(255) NOT NULL FK themes(slug)
  default_geo_code VARCHAR(50)             -- focal gemeente for this project (nullable; users can switch)
  config          JSONB DEFAULT '{}'       -- project-specific overrides
  created_by      UUID FK users(id)
  created_at      TIMESTAMPTZ DEFAULT NOW()
  archived_at     TIMESTAMPTZ              -- soft-delete

project_dashboards
  id              UUID PK
  project_id      UUID NOT NULL FK projects(id) ON DELETE CASCADE
  source_theme_slug VARCHAR(255)           -- which theme this was cloned from
  name            VARCHAR(255)
  layout          JSONB                    -- copy of theme's default layout at clone time
  tiles           JSONB                    -- copy of theme's tiles at clone time
  is_default      BOOLEAN DEFAULT false
```

`project_dashboards` is a snapshot at project-creation time — projects do **not** auto-track changes to system themes. This is intentional: a programme's dashboards are stable; upstream theme updates are pulled in explicitly via "Update from theme" rather than silently mutating a project's view.

### Bootstrap flow

When a user creates a project:

1. **Step 1 — pick a theme.** UI shows supercategories → themes (with preview thumbnails / descriptions).
2. **Step 2 — name + focal gemeente.** Name the project, pick the focal gemeente for the per-municipality drilldown (see ADR-003).
3. **Step 3 — server-side provisioning** (atomic):
   - Insert `projects` row.
   - For every `data_source` in the chosen theme's tiles: ensure a `data_source_subscriptions` row exists for the org (idempotent — no-op if already subscribed). Note: per the project memory rule, this **does not** create per-project sync schedules; sync remains global.
   - Clone the theme's tiles + default layout into `project_dashboards` (`is_default = true`).
   - Mark this project as the user's last-active project.
4. **Step 4 — land in the per-gemeente drilldown view of the project's default dashboard.** The user sees a working dashboard, populated, with cohort + provincial + national reference series (ADR-003).

### Existing entities — relationship

| Existing concept | Relationship to Project |
|---|---|
| `organizations` | 1 org → many projects. |
| `themes` (system) | A project is bound to exactly one theme at creation. Themes remain global / system-defined. |
| `data_source_subscriptions` | Subscriptions remain **org-level** (per the established rule that pulls are global, viewing is per-org). Project creation can *trigger* subscription, but subscription itself isn't project-scoped. This avoids per-project sync schedules and keeps the data fleet shared. |
| `dashboard_templates` (migration 006) | **Repurposed.** This is now the storage for "theme template = the prebuilt tiles + layout to clone into a new project for that theme". The previously unused `tiles JSONB` + `layout JSONB` columns are exactly what we need. Project creation reads from here. |
| `dashboard_layouts` (migration 001 — per-user customisation of system themes) | Unchanged. Pre-project users still see system themes with their own layout overrides. New behaviour layers on top. |
| `Mijn Dashboards / CustomDashboards` | Unchanged. Personal dashboards remain a separate, per-user concept. A project is org-scoped and shared. |

### Sync behaviour (explicit, per the data-pull memory)

Sync schedules (`sync_schedules`, migration 019) are **global**. Project creation does not create per-project sync schedules; it only ensures the org subscription exists. This preserves: pull cadence is shared across orgs, Postgres storage stays shared, and a project becoming inactive does not orphan a sync schedule.

### What is *not* in this ADR

- **Per-project ABAC scoping.** v1 uses existing org-level + role-based access. Per-project roles (e.g. project member vs project admin) are deferred.
- **Project archival / data retention rules.** v1 supports `archived_at` soft-delete; full retention policy is a later concern.
- **Cross-theme projects.** v1 = exactly one theme per project. A municipality wanting both Wonen and Duurzaamheid runs two projects. Multi-theme projects are a possible v2 addition; explicitly out of v1 scope to keep the bootstrap UX simple.
- **Project sharing across orgs.** Out of scope.

## Consequences

**Positive:**
- The platform now matches how stakeholders actually frame their work: "we are running a Woonzorgvisie programme" → one project, one theme, one focal gemeente, populated dashboards in seconds.
- The previously dead `dashboard_templates` table gets a real purpose.
- Existing `data_source_subscriptions` machinery is reused (not duplicated per-project), respecting the global-sync rule.
- Theme work and project provisioning are decoupled: shipping a new theme = updating the template; existing projects don't unexpectedly change.

**Negative / accepted trade-offs:**
- Adds a new top-level concept users must learn ("project"). Mitigated by: most users only ever interact with one project; the concept is invisible until needed.
- Cloning tiles at project-creation means upstream theme improvements need an explicit "Update from theme" gesture per project to land. Acceptable — silent mutation of stakeholder dashboards is worse.
- "Project" is a generic word and may collide with other vocab over time. Considered "Programma" (more accurate to NL gov context) — rejected because the in-app affordance is more universally readable as "Project". Reconsider before public release if user testing pushes back.

**Implementation impact (rough order):**
1. Migration: `projects` + `project_dashboards` tables; FK from `users.last_active_project_id` (optional column).
2. Backfill `dashboard_templates` from existing system theme tiles (one row per theme, with the seeded layout).
3. Server: `POST /api/projects` (create + provision), `GET /api/projects`, `GET /api/projects/:id`, `PATCH /api/projects/:id`, `POST /api/projects/:id/refresh-from-theme`.
4. Client: project switcher in header (left of supercategory nav); new-project wizard (3-step flow above).
5. Routing: `/p/:projectSlug/...` becomes the canonical path; legacy `/dashboard/:themeSlug` continues to resolve to the user's last-active project.
6. CustomDashboards retained but moved to a "Persoonlijk" submenu, not in the main nav.
7. TSD to follow this ADR: `docs/superpowers/specs/<date>-projects-bootstrap-tsd.md`.

## References

- `docs/PRODUCT-VISION.md` — Stage 2 exit criterion is "an admin can spin up a new project in under a minute, fully populated".
- ADR-002 — prebuilt themes as the front door (the user-facing "project = theme picker" flow is the bootstrap of this).
- ADR-003 — per-municipality drilldown with referential cohort (a project lands on the focal gemeente's drilldown view).
- `docs/superpowers/specs/2026-03-26-multi-domain-supercategories-design.md` — supercategory + theme model that projects sit on top of.
- Migration `006_templates.sql` — `dashboard_templates` table, repurposed by this ADR.
- Migration `016_cbs_catalog.sql` — `data_source_subscriptions`, reused as the org-level subscription mechanism.
- Memory: `project_data_pull_vs_view.md` — pulls are global, viewing is per-org. This ADR honours that boundary.
