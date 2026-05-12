# Forge Spec: 'Save as template' from project dashboards

**Cycle:** 2 | **Clock:** ~10 min elapsed | **Size:** medium

## What

Add a 'Bewaren als template' button on the DashboardPage that opens a small modal (name + description + visibility). On submit it POSTs the current tiles + layout to a new `/api/user-templates` endpoint, which creates a `user_templates` row owned by the current user in their organization. Partial close of issue #93.

## Why

EPIC #107 (user templates) has had schema + Zod contracts since PR #115 but no user-facing path. Without a save affordance, advisors can't capture a configured dashboard they've tuned. Shipping the save endpoint + a button unlocks the first half of the EPIC; #94 (wizard "Mijn" tab) consumes the rows this PR creates.

## Success criteria

1. New `POST /api/user-templates` endpoint accepts `{ name, description?, visibility, sourceThemeSlug?, tiles, layout }` and returns a full `UserTemplate` row (ID + timestamps populated by the DB).
2. `<SaveAsTemplateButton>` mounted on DashboardPage opens a modal with name (required), description (textarea, optional), and visibility radio (private / org / public, default private). Submit hits the endpoint; success shows a transient "✓ Template opgeslagen" indicator and closes the modal.
3. After a successful save, a row appears in `user_templates` with `user_id = current user`, `organization_id = current user's org`, `tiles + layout` matching what the page is rendering, and `visibility` matching the radio choice.
4. ≥3 server unit tests (Zod validation, default visibility, owner attribution) + ≥2 component tests (modal open/close, submit posts correct body).

## Approach

- Server: new `routes/user-template.routes.ts` mounting `POST /` and exporting a router; new `controllers/user-template.controller.ts` exporting `createUserTemplate(req, res)`. Use the existing `UserTemplate` Zod contract from `src/shared/api/contracts.ts`. Request body schema reuses `tiles` (`TileConfig[]`) and `layout` (`LayoutItem[]`) from the same contract. Mount in `app.ts` next to the other `/api/...` routers.
- Client: new `services/api/user-templates.ts` with `saveUserTemplate(body)` → `api.post('/user-templates', body)`. New `components/dashboard/SaveAsTemplateButton.tsx` with the modal. Use existing modal/`Button` primitives if present; otherwise a plain Tailwind dialog matching the SyncDemandPicker visual language (small, no Radix).
- Auth: existing `authenticate` middleware. No new role gate — any authenticated user can save a private template. Visibility `org`/`public` doesn't yet gate against org membership (the row's organization_id is just `req.user.organizationId`); a future cycle can layer abac if needed.
- Tests: controller test mocks `query()` (same pattern as `subscriber-notifier.test.ts`). Component test uses `@testing-library/react` and mocks `saveUserTemplate`.
- Mount point: DashboardPage line ~256, right next to `<SyncDemandPicker>`. The button is hidden when `tilesSource` is empty (same heuristic as the SyncDemandPicker).

## Not doing

- No CustomDashboards button (the issue's second surface — separate cycle).
- No wizard "Mijn" tab — that's issue #94.
- No edit / delete / list endpoints — only create. List comes free with #94's wizard.
- No org-scoped visibility validation (any authenticated user can mark visibility=`org` and the row lands in their own org). ABAC layering is a future-cycle concern.
- No new migration. Schema already in place from PR #115 / migration 030.
