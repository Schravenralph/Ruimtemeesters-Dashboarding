# Forge Spec: Mijn templates dedicated page

**Cycle:** 3 | **Clock:** ~14m elapsed | **Size:** S-M

## What

Adds a top-level **/mijn-templates** page accessible from the sidebar.
Lists the current user's saved templates (the `mine` scope of
`user_templates`) with full management: rename, visibility flip,
delete. Mirrors the affordances that already live inside the
new-project wizard's Mijn tab, but as a dedicated surface.

## Why

Today, a user who saved 5 templates can only find them by going to
**Nieuw project → wizard step 1 → Mijn tab**. That conflates *managing*
templates with *bootstrapping a project*. An advisor who wants to
"clean up my templates" or "rename a typo" has no first-class entry.

The DELETE button shipped this morning (cycle 2) is otherwise stranded
in a workflow the user only enters when starting a new project.

## Success criteria

1. Sidebar shows a **Mijn templates** entry under "Mijn dashboards"
   (Bookmark icon). Visible to authenticated users.
2. `/mijn-templates` loads the user's templates via existing GET
   `/api/user-templates?scope=mine` — no new endpoint.
3. Each template card shows name, description, source theme,
   visibility, and tile/source counts.
4. Inline rename (click name → editable input → blur saves). Uses
   existing PATCH /api/user-templates/:id (already accepts name).
5. Visibility select (private/org/public) — reuses existing PATCH.
6. Delete button — reuses existing DELETE.
7. Empty state with a clear CTA: "Maak een template door op een
   dashboard 'Bewaren als template' te kiezen."

## Approach

- New page `src/client/pages/MijnTemplatesPage.tsx`.
- New route in `App.tsx` for `/mijn-templates`.
- Sidebar entry under the existing Mijn-dashboards block.
- No new server work — every endpoint already exists.
- No new tests required for the server side. Optionally a render
  smoke for the page if a `@testing-library/react` setup exists in
  the repo — otherwise skip and rely on the manual end-to-end check.

## Not doing

- Use-in-new-project link with `?template=<id>` prefill. Possible
  follow-up but adds wizard wiring; out of scope.
- Org/public listing on this page — that already lives in the wizard
  and the conceptual home of org-public discovery is project
  bootstrap, not personal-template management.
- Bulk operations. Counts are small.
