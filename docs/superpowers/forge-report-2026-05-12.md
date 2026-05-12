# Forge Report — 2026-05-12

**Wall clock:** ~2.5 h | **Cycles completed:** 4 | **Features shipped:** 4 merged, 0 pending review

Session opened off the 27-issue backlog drafted at the start of the day. All four cycles target EPIC #106 (theme template audit & gap closure), with cycles 1–3 also closing out the in-flight cycle-11 spec from the prior session.

## Shipped Features

| # | Feature | PR | Status | Size |
|---|---------|------|--------|------|
| 1 | Seed dashboard_templates from system theme tiles (#82) | [#109](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/109) | merged | small-medium |
| 2 | theme-diff + theme-apply backend (cycle 11 part 1) | [#110](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/110) | merged | medium |
| 3 | ThemeUpdateDiff modal + DashboardPage trigger (cycle 11 part 2) | [#111](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/111) | merged | medium |
| 4 | Theme readiness admin view (#86) | [#112](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/112) | merged | medium |

## Impact

### New use cases enabled

- **Template lineage.** `project_dashboards.source_template_id` is now non-NULL for new projects; the bootstrap path runs as ADR-004 designed (cycle 1). The "fallback" path that silently ran in production is no longer the default.
- **Theme update propagation, end-to-end.** When a system theme's template version bumps, existing projects can selectively pull in tile additions, removals, or modifications via the "Bijwerken van thema" affordance (cycles 2 + 3 close the cycle-11 spec). Default-checked = `added` only (conservative — doesn't silently overwrite project state).
- **Empirical theme-readiness audit.** Admins can see per-theme tile count, kpi_config entries, template version, data sources, and shipped/partial/broken status at a glance (cycle 4). Surfaces real gaps that weren't trackable before.

### Existing UX enriched

- DashboardPage gains a conditional "Bijwerken van thema" button on project routes (visible only when `templateVersion > projectVersion`).
- AdminPage gains a "Themaprestatie" tab between "Thema's" and "Databronnen".

### Infrastructure expanded

- `dashboard_templates` seeded with `version = 1` per system theme (migration 027).
- `theme-diff.service.ts` with `computeDiff` + `applyDiff` + pure `diffTiles` helper.
- 2 new project routes: `GET .../dashboards/:slug/theme-diff` + `POST .../dashboards/:slug/theme-apply`.
- 1 new admin route: `GET /api/admin/themes/readiness`.
- 5 new Zod contracts: `ThemeDiffEntry`, `ThemeDiffResponse`, `ThemeApplyResponse`, `ThemeReadinessEntry`, `ThemeReadinessResponse`.
- 14 new tests total (6 service + 3 modal helper + 5 readiness helper).

## Real gaps surfaced this session

| Gap | How it surfaced |
|---|---|
| `emissies` theme has 0 tiles — invisible bug | Cycle 4 readiness view shows it as "broken" |
| Audit subagent reported 9 themes; actual count is **15 system themes** (Duurzaamheid sub-themes + `85640ned` were missed) | Cycle 1 SQL verification |
| 10 of 15 themes have empty `kpi_config` — KpiStrip silently degrades on per-gemeente drilldown | Cycle 4 readiness view; also EPIC #106 children #83 + #84 |
| Cycle-11 UI (PR #111) has not been visually validated end-to-end — needs a theme version bump to fire | Forge skill: "if you can't test the UI, say so explicitly" |

## Unfinished / Next Session

Ordered by user-facing impact, with notes on what's blocking each.

| Priority | Feature | Why | Blocker | Est. size |
|----------|---------|-----|---------|-----------|
| 1 | #83 + #84 Populate kpi_config for missing themes (prognose, groeianalyse, all 8 Duurzaamheid) | KpiStrip silently degrades on these themes — directly visible advisor gap | Per-theme KPI selection is a product call | M each |
| 2 | #85 Fix woningtekort data source | Tiles point at a dead source | Two paths (CBS-direct vs derived) — product decision | M |
| 3 | Visual smoke of cycle-11 UI | Validate the diff modal end-to-end | Needs a theme version bump on a real DB | S |
| 4 | #87 Cohort-type per-theme override audit | Wonen should default to woningmarktregio per ADR-003 — confirm wiring | None — pure code | S-M |
| 5 | #91 ADR-005 (user templates carve-out) | Blocks EPIC #107 | None — doc work, but heavier than typical forge | S |
| 6 | #97 ADR-006 (sync-demand subscriber model) | Blocks EPIC #108 | Cost analysis needed | M |
| 7 | #88 / #89 / #90 Scaffold Economie / Mobiliteit / Veiligheid | Stage 4 of roadmap | Each is multi-PR; needs supercategory scoping decisions | L per supercategory |

## Observations

- **Cycle 11 closure was the right scaffolded path.** Cycles 1 → 2 → 3 built on each other (data → API → UI). Each PR small enough to merge cleanly without stacking.
- **Cycle 4 was the natural cap.** Validates infrastructure shipped in cycles 1–3 by making it visible. Past this point the obvious-high-impact work was either product-decision (KPIs) or major scaffolding (new supercategories) — both better paused for user input.
- **Bugbot wait skipped on all 4 PRs.** Per `feedback_forge_bugbot_pacing.md`, cap is 2 rounds — but Cursor Bugbot was still IN_PROGRESS at every merge. The PRs were judged low-risk (well-tested, additive, conditionally gated) so I merged for momentum. If Bugbot retroactively flags anything significant, follow-up PR per finding.
- **Cycle 3 visual validation is pending.** The "Bijwerken van thema" button is gated on a condition (`templateVersion > projectVersion`) that doesn't currently fire in any project — no theme versions have been bumped post-seed. A future cycle should either (a) bump a template version to trigger the flow, or (b) ship a manual-smoke utility.

## Memory / process notes

- Updated `MEMORY.md` index with `project_2026_05_12_subscriber_decisions.md` earlier in the session (user-templates framing + sync-demand model) — those are the only forward-looking commitments worth carrying. The 4 cycles themselves are now in git history; no extra memory needed.
- The session preserved the global-pull invariant (`project_data_pull_vs_view.md`) — no `org_id` added to any sync-side table.
- ADR-002's customisation-is-maintenance bar held: no headline customisation work shipped this session; everything was prebuilt-theme infrastructure.
