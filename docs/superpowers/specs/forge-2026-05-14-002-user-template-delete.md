# Forge Spec: DELETE on user_templates (CRUD completion)

**Cycle:** 2 | **Clock:** ~10m elapsed | **Size:** S
**Refs:** Evening report 2026-05-12 priority #3, migration 030.

## What

Adds `DELETE /api/user-templates/:id` and a trash-can button on the
"Mijn" tab card so users can remove templates they no longer want
(typos, abandoned experiments, etc.).

Authorisation:
- Owner can always delete.
- Org admin can delete any `org`-visible template in their own org.
- Public-visible templates can only be deleted by their owner (don't
  let org admins delete a template that has cross-org reach without
  explicit platform-admin curation).

If a `dashboard_templates` row references the user template via
`source_user_template_id` (promoted templates), the ON DELETE SET NULL
already wired in migration 034 handles it cleanly — the promoted row
keeps existing with `originalUserName` becoming `null`.

## Why

Closes the last CRUD gap on user_templates. Today a user who saves a
template with a typo or builds an experiment they no longer want is
stuck with it in their Mijn-tab forever. The evening report flagged
this as priority #3 (small, completes the CRUD).

## Success criteria

1. `DELETE /api/user-templates/:id` returns 204 on success; 404 on
   missing id; 403 when caller is neither owner nor org admin (for
   `org`-visible) nor owner (for `public`-visible).
2. Mijn-tab card shows a trash-can button that triggers a confirm
   dialog and on confirm calls DELETE and refreshes the list.
3. Promoted dashboard_templates row (if any) survives the delete and
   shows `Origineel: —` in the admin Template promoties tab.
4. Vitest: 4 cases (owner delete, org-admin delete on org template,
   cross-user 403 on org template, owner-only 403 path for public).

## Approach

- One controller export `deleteUserTemplate` in
  `user-template.controller.ts` (no new file).
- Route mounted in existing `user-template.routes.ts`.
- Mijn-tab card lives in the wizard's template gallery — find it,
  add a small `<button>` (Tailwind ghost style) wired to a confirm +
  DELETE call.
- Test file: extend
  `user-template-update.controller.test.ts` or add a focused
  `user-template-delete.controller.test.ts`. Latter is cleaner.

## Not doing

- Soft-delete / restore. If the user wanted that they'd have asked
  for "trash" UX explicitly. Hard delete is fine.
- Promoted-template cascade (deleting the promoted system template
  too). Promoted = curated, lives independently.
- Bulk delete. Not needed at current template counts.
