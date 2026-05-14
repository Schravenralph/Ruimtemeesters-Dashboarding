# Forge Spec: Template promotion (user → system) with audit log

**Cycle:** 1 | **Clock:** ~0h elapsed | **Size:** M-L
**Closes:** issue #96 → EPIC #107 (final child).
**Refs:** ADR-005 (carve-out), migration 030 (user_templates), 006/026 (dashboard_templates), 002 (audit_log).

## What

Adds the platform-admin promotion path: an `org`- or `public`-visible
`user_templates` row can be promoted to a system-wide
`dashboard_templates` row by a platform admin, with attribution to the
original creator and an audit-log entry.

In scope:

- **Schema migration 034**: add `source_user_template_id UUID`,
  `promoted_by_user_id UUID`, `promoted_at TIMESTAMPTZ` to
  `dashboard_templates`. Nullable to preserve the existing seeded rows.
- **POST /api/admin/templates/promote** (admin role only):
  - input: `{ userTemplateId, name?, description? }`
  - reads source `user_templates` row (must exist; visibility must be
    `org` or `public`)
  - inserts into `dashboard_templates` with `category='community'`,
    `tiles`, `layout` copied verbatim, lineage columns filled
  - writes audit entry: `action='template.promote'`,
    `resource_type='dashboard_template'`, details =
    `{ sourceUserTemplateId, sourceUserId, sourceVisibility }`
  - returns the new `dashboard_template` row
- **GET /api/admin/templates/promoted** (admin role only) — list
  promoted templates with original-author info via JOIN to users.
  Powers the admin UI.
- **Admin UI tab "Template Promotions"**: lists candidates
  (user_templates with visibility ∈ {org, public}) with a "Promote"
  button → confirm modal → POST. Also lists already-promoted templates
  with the `Original: <user>` attribution shown next to each row.

Org-admin promotion (private → org) is already covered by
`updateUserTemplate` (visibility PATCH); not re-implemented here.

## Why

- Closes the only open EPIC #107 child. The user-templates programme
  becomes 6/6 complete with this PR, which means advisor-curated
  dashboards have a path into the canonical system set.
- Real workflow: an advisor builds a high-quality Wonen-with-cohort
  dashboard, shares it `org`, the org admin nominates it, the platform
  admin promotes it → it appears in the new-project wizard's `Systeem`
  tab for every new project across every org. Without this, curated
  community templates are stuck at org scope.
- Audit log entry satisfies the compliance ask from ADR-005: any
  change to system-visible artefacts has a who/when/from record.

## Success criteria

1. Migration 034 applies cleanly on an existing DB (run `npm run
   migrate` or equivalent — verify columns appear via `psql \d`).
2. `POST /api/admin/templates/promote` with `userTemplateId` of an
   `org`-visible row returns 201 with a new `dashboard_templates` row
   that has lineage columns populated; subsequent
   `GET /api/admin/templates/promoted` shows it; `audit_log` table has
   one new row with `action='template.promote'`.
3. Non-admin caller hitting the same endpoint returns 403.
4. Promoting a `private` user_template returns 400 with
   `Template must be org- or public-visible to promote`.
5. Admin UI tab shows up at /admin → Template Promotions, lists
   candidates and shows the `Original: <name>` attribution. Clicking
   Promote on a candidate writes through and the row moves from the
   "candidates" list to the "promoted" list.

## Approach

- One migration file `034_dashboard_templates_promotion_lineage.sql`.
- New route file `src/server/routes/admin-template.routes.ts` (mounted
  under `/api/admin/templates` in `app.ts`).
- Controller `src/server/controllers/admin-template.controller.ts` with
  `promoteTemplate` + `listPromotedTemplates`.
- Reuse `logAudit` from `src/server/services/audit.service.ts`.
- Reuse `requireRole('admin')` middleware.
- UI: one new component `src/client/components/admin/TemplatePromotions.tsx`,
  wired into `AdminPage.tsx`'s tab list as `'templatepromotions'`. Use
  the same Tailwind shape as `SyncDemandsAdmin.tsx`.
- Tests: vitest unit test for `promoteTemplate` (mocked db) covering
  the happy path, the 403 path, the 400-on-private path, and the
  audit-log call. No e2e — UI verified manually via dev server.

## Not doing

- DELETE on dashboard_templates ("un-promote"). Out of scope; if
  needed, file a follow-up.
- Versioning of promoted templates (re-promote a newer snapshot).
  v1 inserts a new row each time; users keep both.
- Notification to the original author when their template is promoted.
  Nice-to-have, not in acceptance criteria.
- Migration 027's existing seeded rows getting backfilled lineage —
  they're not promoted from user templates, they're theme seeds.
