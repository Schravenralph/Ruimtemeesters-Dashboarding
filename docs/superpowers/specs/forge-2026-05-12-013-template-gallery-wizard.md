# Forge Spec: Template gallery in new-project wizard

**Cycle:** 3 | **Clock:** ~17 min elapsed | **Size:** medium-large

## What

Extend step 1 of `NewProjectWizardPage` with four tabs — Systeem (current behaviour) / Mijn / Org / Publiek — that let an advisor pick either a system theme or a saved `user_templates` row as the basis for the new project. Selecting a user template runs the same bootstrap flow as picking a system theme. Closes issue #94.

## Why

Issue #93 (PR #123) added the save-as-template affordance; rows now land in `user_templates` but there's no surface that consumes them. Without a picker, the persistent templates are invisible — advisors can't actually start a project from a previously-saved configuration. This closes the loop end-to-end and is the highest-impact follow-on to cycle 2.

## Success criteria

1. New `GET /api/user-templates?scope={mine|org|public}` returns the matching templates. `mine` = `user_id = req.user.id`. `org` = `organization_id = req.user.organizationId AND visibility = 'org'`. `public` = `visibility = 'public'`.
2. Wizard step 1 has four pill-tabs. Default "Systeem" preserves the current grouped theme picker. Mijn/Org/Publiek render cards per template (name + description + small "X tiles, Y dimensies" hint).
3. Selecting a user-template stores its id and clears `themeSlug`; the wizard continues to step 2 normally. The "create" call sends `{ userTemplateId }` instead of `{ themeSlug }`.
4. Bootstrap accepts `userTemplateId` (mutually exclusive with `themeSlug`): loads tiles + layout from `user_templates`; uses the template's `source_theme_slug` for the `projects.theme_slug` field (or `'custom'` if null); `project_dashboards.source_template_id` is null for user-template-derived dashboards.
5. ≥3 server tests (list scoping, bootstrap-from-template, mutual-exclusion) + ≥2 client tests (tabs render, switching tabs swaps the grid).

## Approach

- **Server list**: add `listUserTemplates(req, res)` in `user-template.controller.ts`. Single SQL per scope. Returns `{ rows: UserTemplate[] }`. Route `GET /` on the existing `user-template.routes.ts`.
- **Bootstrap extension**: `BootstrapInput` gets `userTemplateId?: string` (made non-optional from `themeSlug` via union OR runtime check). New branch in `project-bootstrap.service.ts` step 1: `if (input.userTemplateId)` → SELECT tiles, layout, source_theme_slug FROM user_templates WHERE id = $1 AND (visibility != 'private' OR user_id = $userId) — i.e. enforce visibility on read. Falls through to existing theme-path otherwise.
- **Controller**: `createProject` parses `userTemplateId` OR `themeSlug`. Exactly one must be present. The error message preserves the existing API surface for theme-only callers.
- **Client**:
  - `services/api/user-templates.ts` gains `listUserTemplates(scope)`.
  - `services/api/projects.ts` `createProject` accepts an optional `userTemplateId` (also union with `themeSlug`).
  - `NewProjectWizardPage` step 1 splits into a `<WizardStep1>` with internal `mode: 'theme' | 'template'` and `tab: 'systeem' | 'mijn' | 'org' | 'publiek'` state. Picking a tab triggers the appropriate list fetch (cache in component state). Selection sets either `themeSlug` or `userTemplateId` (one clears the other).
- **Tests**:
  - Server: scope-mine (returns own private), scope-org (returns org rows, excludes other-orgs), bootstrap-from-template (project row has correct theme_slug + tiles), mutual exclusion 400.
  - Client: tab switching renders new options; selecting a Mijn template enables Volgende.

## Not doing

- No template thumbnails / preview-pane in v1 — name + description + tile-count hint only.
- No edit / delete on user templates yet — picking is read-only.
- No ABAC on visibility (`org` rows in another user's org are filtered by org_id in the SQL; `public` is global). Future cycle if abuse appears.
- No "promote my template to org" path — that is issue #96 in a later cycle.
- Publiek tab can be empty / show empty state — that's fine for v1.
- No new migration. All schema in place from PR #115.
