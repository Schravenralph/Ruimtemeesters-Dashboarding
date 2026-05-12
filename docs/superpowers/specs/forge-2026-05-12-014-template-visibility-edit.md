# Forge Spec: Edit user-template visibility (org sharing)

**Cycle:** 5 | **Clock:** ~55 min elapsed | **Size:** medium

## What

Add a `PATCH /api/user-templates/:id` endpoint that lets the template owner (or an org admin) change a template's `visibility`. Surface a small dropdown on each card in the wizard's **Mijn** tab so advisors can flip private → org → public without leaving the picker. Closes issue #95.

## Why

Cycle 2 (#93) lets advisors create templates with a chosen visibility at save time. Cycle 3 (#94) consumes org/public templates in the wizard. But there's no way to change a template's visibility after the fact — once saved private, an advisor can't share it with their org. #95 closes that gap and unblocks #96 (promotion). It's the last child of EPIC #107's user-facing path.

## Success criteria

1. `PATCH /api/user-templates/:id` accepts `{ visibility?, name?, description? }`. Auth: 401 without user; 403 when caller is not the template owner AND not an admin in the template's org; 404 when the template doesn't exist.
2. Successful PATCH returns the updated `UserTemplate`. `updated_at` is bumped server-side. Unspecified fields are unchanged.
3. The wizard's **Mijn** tab shows a small "Zichtbaarheid" select on each card. Changing it fires the PATCH and immediately updates the local list (optimistic).
4. ≥3 controller tests (owner-success, admin-on-same-org-success, non-owner-non-admin-403) + ≥2 component tests (select renders + change fires PATCH).

## Approach

- **Server**: extend `user-template.controller.ts` with `updateUserTemplate(req, res)`. SELECT row → 404 if missing. Authorisation: allow if `row.user_id === req.user.id` OR (`req.user.role === 'admin'` AND `row.organization_id === req.user.organizationId`). Then UPDATE with COALESCE for partial fields. Mount `PATCH /:id` on the existing routes file.
- **Contract**: new `UpdateUserTemplateRequest` in `shared/api/contracts.ts` — all fields optional, at-least-one-required guard inline in the controller.
- **Client API**: `updateUserTemplate(id, body)` → `api.patch('/user-templates/' + id, body)`.
- **UI**: in `TemplateGalleryStep`, when `tab === 'mijn'`, render a `<select>` next to the card's name showing current visibility. `onChange` fires the PATCH, then mutates the local cached row. Failures revert the select and surface an alert in the existing error slot.
- **Tests**: controller mocks `query()` (same pattern). Component test uses an extra prop to detect PATCH calls (or mocks `updateUserTemplate`).

## Not doing

- No template-detail page. The dropdown lives on the card; no separate edit screen.
- No name/description editing in the UI for v1 (the endpoint supports it; the picker exposes only visibility — a more elaborate edit modal can come later).
- No delete endpoint / button — out of scope.
- No audit log (that's #96).
- Promotion to `dashboard_templates` system row — that's #96.
- No new migration.
