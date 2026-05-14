# Forge Report — 2026-05-14 (morning)

**Wall clock:** ~16 min
**Cycles completed:** 3
**Features shipped:** 3 merged, 0 pending review

## Shipped Features

| # | Feature | PR | Status | Size |
|---|---------|------|--------|------|
| 1 | #96 Admin promotion: user_templates → dashboard_templates with audit log | [#128](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/128) | merged | M-L |
| 2 | DELETE on user_templates + Mijn-tab trash-can button | [#129](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/129) | merged | S |
| 3 | /mijn-templates dedicated page + sidebar entry | [#130](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/130) | merged | S-M |

## Impact

### EPICs closed

| EPIC | Before | After | Δ |
|---|---|---|---|
| #107 user-templates programme | 5/6 | **6/6** | **closed** (PR #128) |

### New use cases enabled

- **End-to-end template promotion pipeline.** Advisor → org admin → platform admin → system-wide. Migration 034 adds lineage columns; admin tab "Template promoties" lists candidates and shows `Origineel: <user>` attribution on promoted rows. `audit_log` writes `template.promote` with full source details.
- **Full CRUD on user templates.** Owners (and org admins on `org`-visible rows within their org) can delete. Promoted dashboard_templates survive via `ON DELETE SET NULL`.
- **First-class management surface.** `/mijn-templates` page lets advisors rename, retag visibility, and delete their templates without entering the project wizard. Closes the discovery gap where the delete button shipped this morning would otherwise have been stranded inside the wizard flow.

### Existing UX enriched

- AdminPage tab list gains "Template promoties" with candidates + promoted tables, including `Origineel: <user>` attribution on hover (mouseover shows email).
- Wizard's Mijn-tab card already had visibility-select; now also has a delete button (cycle 2).

### Infrastructure expanded

- Migration 034: `source_user_template_id`, `promoted_by_user_id`, `promoted_at` on `dashboard_templates`. Nullable to preserve theme-seed rows from migration 027. Index on `promoted_at DESC` for the admin view.
- New routes: `POST /api/admin/templates/promote`, `GET /api/admin/templates/{candidates,promoted}`, `DELETE /api/user-templates/:id`.
- 12 new vitest cases (6 promote, 6 delete) covering owner/org-admin/platform-admin authorisation matrices, audit-log shape, 400/403/404 paths.

## Unfinished / Next Session

| Priority | Feature | Why | Est. size |
|----------|---------|-----|-----------|
| 1 | **Notification to original author when promoted** | Closes the feedback loop on the promotion flow shipped today — author learns their work was elevated. Uses existing `notification.service.createNotification`. | S |
| 2 | **Org-admin "Nominate for promotion" flag** | Today there's no path between "share `org`" and "platform admin promotes" except out-of-band Slack/email. Adds `nominated_at` + `nominated_by_user_id` on `user_templates`, button on org-visible cards, sort order in admin candidates view. | M |
| 3 | **Visual smoke** of cycles 1-3 in a real browser | After 3 fast cycles in the same area, a manual sweep at /admin → Template promoties + /mijn-templates + wizard Mijn tab would catch any wiring regression. | S |
| 4 | **Supercategory scaffolds #88/#89/#90** (Economie / Mobiliteit / Veiligheid) | Still data-blocked per evening 2026-05-12 report. Requires CBS data wiring per supercategory, not just schema. | L per supercategory |

## Observations

- **Same "stack on yesterday's EPIC" pattern from the 2026-05-12 evening report.** Yesterday landed #93/#94/#95 (the templates-creation half of EPIC #107). Today closed #96 (the promotion half) plus polish (DELETE + dedicated page). 4 cycles in a row on `user_templates` — exactly the "circling the same area" signal flagged in the prior report.
- **All 3 PRs squash-merged on first push.** No bugbot iterations needed. GitGuardian + Gitar pending at merge time per the cap from `feedback_forge_bugbot_pacing.md`.
- **End-to-end container rebuild proved valuable.** Cycle 1 rebuilt the docker image, which made cycle 2 + 3 verifiable via real HTTP against the running container. This pairs with the morning's Platform `local-dev-vs-docker-handoff.md` standard: the docker container IS the dev workflow when MCP / verification matters.
- **Auto memory + Platform standard prevented a known regression.** This morning saw a session where the MCP `host.docker.internal` workaround was re-tried after the rollback. The fact that the rollback wrote both the Platform standard AND updated `reference_local_5022_conflict.md` to call out the wrong pattern explicitly meant the forge session started today with the *right* baseline (docker container running, MCP env canonical). Session start-up cost dropped from 30+ min of context recovery to ~5 min of "where did the last forge stop".
- **State-file contamination still present.** `/tmp/forge-session.json` had to be reset because prior cycles were from Memory + Document-Generator runs. Per-project state-file remains a sharp edge — same observation as the 2026-05-12 report.
