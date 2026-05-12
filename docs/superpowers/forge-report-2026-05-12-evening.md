# Forge Report — 2026-05-12 (evening)

**Wall clock:** ~85 min
**Cycles completed:** 5
**Features shipped:** 5 merged, 0 pending review

## Shipped Features

| # | Feature | PR | Status | Size |
|---|---------|------|--------|------|
| 1 | #103 Sync subscriber notifications (data_arrived + frequency_changed) | [#122](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/122) | merged | M |
| 2 | #93 'Save as template' button + POST /api/user-templates (DashboardPage surface) | [#123](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/123) | merged | M |
| 3 | #94 Template gallery in new-project wizard (Systeem/Mijn/Org/Publiek tabs + bootstrap-from-template) | [#124](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/124) | merged | M-L |
| 4 | #93 'Save as template' on CustomDashboardEditorPage (second surface — full close) | [#125](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/125) | merged | S |
| 5 | #95 Edit user-template visibility (PATCH endpoint + Mijn-tab select with owner/org-admin RBAC) | [#126](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/126) | merged | M |

## Impact

### EPICs closed or near-closed

| EPIC | Before | After | Δ |
|---|---|---|---|
| #108 sync-demand subscriber loop | 8/9 | **9/9** | closed |
| #107 user-templates programme | 2/6 | **5/6** | only #96 promotion left |

### New use cases enabled

- **Sync subscribers actually get notified.** Submit a Wekelijks demand via Updatefrequentie → on the next sync run with new rows, every user-kind subscriber sees an in-app toast ("Nieuwe data: Bevolking — 1.234 rijen verwerkt"). Aggregator-driven cron changes also fire a frequency_changed notification. Schedule-owner dedup prevents double-fire.
- **Templates as a first-class artefact.** Advisor tunes a dashboard, hits "Bewaren als template" (private/org/public radio), and the next time they create a project the wizard's **Mijn** tab surfaces it. Picking it bootstraps tiles + layout instead of starting from the system theme.
- **Templates can be shared after the fact.** A snapshot saved private can be flipped to `org` from the Mijn tab without re-saving. Owners and org admins both have authority; cross-org admins blocked.

### Existing UX enriched

- New-project wizard step 1 now has tabs instead of a single grouped theme picker. Systeem-tab behaviour is unchanged for users who don't have any templates.
- CustomDashboardEditorPage gets the same Bewaren-als-template affordance as the project-DashboardPage, so the two surfaces no longer diverge.

### Infrastructure expanded

- `POST` / `GET` / `PATCH /api/user-templates` (CRUD-minus-delete). The DELETE intentionally deferred — no UX call yet asked for it.
- `bootstrapProject` accepts either `themeSlug` OR `userTemplateId`, with visibility enforcement on read.
- New `subscriber-notifier` service mirrors `cbs/sync-notifier`'s shape; future events (e.g. `sync_failed`) can be added without restructuring.

## Unfinished / Next Session

| Priority | Feature | Why | Est. size |
|----------|---------|-----|-----------|
| 1 | **#96** Template promotion (user → org → system) with audit log | Last EPIC #107 child. Higher-risk: writes to `dashboard_templates` (system-wide) and needs an audit log. Best done with explicit product scoping on who can promote and how attribution displays. | M-L |
| 2 | **Visual smoke of cycles 1–5** | Five UI-touching cycles shipped without dev-server smoke (we leaned on unit + integration tests). A manual sweep at /dashboard, /mijn-dashboards, /projects/new (with tabs) would catch any wiring regression before a user does. | S |
| 3 | **DELETE /api/user-templates/:id + button** | Currently a template saved with a typo can never be cleaned up. Pairs naturally with the visibility select on the Mijn card. | S |
| 4 | **Supercategory scaffolds #88/#89/#90** (Economie / Mobiliteit / Veiligheid) | Still data-blocked. Requires CBS data wiring per supercategory, not schema. | L per supercategory |

## Observations

- **Stacking cycles within an EPIC worked very well.** Cycle 1 hit a different EPIC (#108 closure), then cycles 2 → 3 → 4 → 5 all stacked on the same `user_templates` schema. Each cycle benefited from the contracts + service patterns of the prior; the average cycle time dropped from ~35 min (cycle 2) to ~10 min (cycle 4). The natural pause signal was hit at the end of cycle 5 — the same "4 cycles in a row on the same area" rule from the morning's report.
- **`tsx watch` reliability problem repeated.** Adding a new route file (`PATCH /:id` in cycle 5) didn't get picked up until a full kill-and-restart. This is the same failure mode logged in `reference_local_5022_conflict.md` this morning. The memory is now well-validated; consider adding a dev-script shortcut (e.g. `pnpm dev:restart`) that hard-kills + spawns instead of relying on the watcher.
- **No bugbot iterations needed.** All 5 PRs merged on first push with GitGuardian + Gitar green and Bugbot still in-flight at merge time. Matches the cap from `feedback_forge_bugbot_pacing.md`; bugbot pings were not gating value.
- **Production is now ~5 commits ahead of the docker image.** The earlier session ended with a fresh deploy at commit `34e9d8f` (PR #122). PRs #123-#126 are merged to main but not yet rebuilt into the container. Next action when the user is ready to ship: `docker compose build app && pkill -f 'tsx watch' && docker compose start app`.
- **State-file contamination.** `/tmp/forge-session.json` got cross-polluted with a concurrent Geoportaal forge run mid-session. Cycles 1–5 are recorded in git history (PR numbers + commit messages), so it didn't matter — but the forge skill's single-file convention is a sharp edge when multiple Claude instances run on the same machine. Worth a tweak in the skill (per-project state, or namespacing).
