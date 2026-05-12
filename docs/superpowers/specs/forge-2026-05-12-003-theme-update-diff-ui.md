# Forge Spec: ThemeUpdateDiff modal + DashboardPage trigger (UI)

**Cycle:** 3 (this session) | **Clock:** ~1.5 h elapsed | **Size:** medium

## What

The user-facing surface on top of cycle 2's diff/apply backend. Adds:

- `src/client/components/dashboard/ThemeUpdateDiff.tsx` — modal that fetches the diff, lists each entry (added / removed / modified) with a checkbox, lets the user pick which to apply, and POSTs the selection. Closes on success and refreshes the page state.
- `getThemeDiff` + `applyThemeDiff` in `src/client/services/api/project-dashboards.ts`.
- "Bijwerken van thema" button on `DashboardPage`, next to "Layout bewerken", visible only when on a project route AND `templateVersion > projectVersion`.
- Snapshot/behavior test for the modal (renders entries, default-checked = added only, Apply disabled until at least one is checked).

## Why

Cycle 2 (PR #110) shipped the backend. Without the UI, projects can never receive template upgrades, so the propagation channel is closed end-to-end. This closes it. Once merged, the cycle-11 spec is fully delivered.

## Success criteria

1. On a project route (`/p/:projectSlug/:dashboardSlug`), DashboardPage calls `getThemeDiff` after the project dashboard loads. If `templateVersion > projectVersion`, a "Bijwerken van thema" button appears next to "Layout bewerken".
2. Clicking the button opens the modal. Modal lists each diff entry with: kind chip (Toegevoegd / Verwijderd / Gewijzigd), tileId, and the tile title from `after?.title ?? before?.title`.
3. Default checked = `added` entries only (conservative — most users want new content without losing local edits).
4. Apply button disabled until at least one entry is checked.
5. On Apply, posts `{ tileIds }` to the apply endpoint and on success: closes the modal, reloads the dashboard tiles, shows a brief "Thema bijgewerkt" toast/banner (optional — can defer if unwired).
6. Theme-route behaviour (`/dashboard/:slug` without a project) is unchanged.

## Approach

- Use existing `<Modal>` (max-width xl for the diff list).
- Default-check logic isolated in `pickDefaultSelection(entries)` for unit testing.
- Modal owns its own fetch + apply state (no parent prop drilling for tile lists).
- After Apply, call a parent-provided `onApplied()` that refetches the project dashboard so tiles re-render with the new content.

## Not doing

- Toast/notification system (use a console.info as ack if no existing toast machinery is one-line away).
- Auto-open on first visit when an update is available — user-driven only (per cycle-11 spec).
- Per-entry detail diff view (e.g. "config.color changed from X to Y") — entries collapse to one row. Detail diff is a future cycle if user testing demands it.
- Email/inbox notification when a theme version bumps — sync-subscriber EPIC concern.
