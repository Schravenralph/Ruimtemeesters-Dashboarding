# Forge Report — 2026-05-10

**Wall clock:** ~4.2 h | **Cycles:** 8 (7a/7b counted separately) | **PRs:** 9 opened, 8 merged, 1 open

This session implemented the four design specs landed earlier the same day (SPEC-A through SPEC-D) as a marathon. Each cycle was a separate branch + PR; bugbot reviewed each, with cap-2-rounds remediation per the `feedback_forge_bugbot_pacing.md` memory rule.

## Shipped Features

| # | Cycle | Feature | PR | Status | Time |
|---|---|---|---|---|---|
| — | docs | Vision + 3 ADRs + 4 specs in one prep PR | [#57](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/57) | merged | — |
| 1 | SPEC-A | Cohort data layer (schema, ingest, `/api/cohorts`, `references=` extension) | [#58](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/58) | merged | 17 m |
| 2 | SPEC-B spine | `referenceVisibility` + `useDataQuery` + Renderer + LineChart | [#59](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/59) | merged | 8 m |
| 3 | SPEC-B charts | BarChart + HorizontalBar + NumberDisplay refs | [#60](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/60) | merged | 4 m |
| — | hotfix | `envelope` `z.coerce.boolean` → `z.preprocess` | [#61](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/61) | merged | small |
| 4 | SPEC-B tail | ColorTable + ChoroplethMap refs | [#62](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/62) | merged | 2 m |
| 5 | SPEC-C stage 1 | `useCohortMemberships` + GemeenteHeader + CohortToggles | [#63](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/63) | merged | 6 m |
| 6 | SPEC-C stage 2 | `themes.kpi_config` + KpiStrip + Wonen seed | [#64](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/64) | merged | 4 m |
| 7a | SPEC-D backend | `projects` + `project_dashboards` schema + atomic bootstrap + REST endpoints | [#65](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/65) | merged | 6 m |
| 7b | SPEC-D frontend | ProjectContext + ProjectSwitcher + 3-step wizard + `/p/:slug` routes | [#66](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/66) | open | 9 m |

(`time` excludes bugbot wait + rebase cascading time.)

## Impact

### New use cases enabled
- **Per-municipality drilldown view** — cohort + provincial + national reference series rendered by default on every Tier-1 chart type.
- **Theme-as-template project bootstrap** — pick a theme, name it, focal gemeente; project + subscriptions + cloned dashboard atomically created.
- **Cohort-aware comparison** — wethouder/raadslid lands on a Wonen view, sees "this gemeente vs cohort vs Nederland" automatically.

### Existing UX enriched
- Every line/bar/HorizontalBar/NumberDisplay/ColorTable/Choropleth chart now has reference series visible by default.
- Dashboard page gains a focal-gemeente shell (GemeenteHeader + CohortToggles + KpiStrip) when geoLevel === 'gemeente'.
- Header gains ProjectSwitcher dropdown.

### Infrastructure expanded
- `cohort_definitions` + `cohort_members` tables (mig 024) with provenance per definition.
- `themes.kpi_config` JSONB column (mig 025) for theme-driven KPI tile lists.
- `projects` + `project_dashboards` tables (mig 026); `users.last_active_project_id`; `dashboard_templates` extended (theme_slug + version + updated_at).
- New endpoints: `/api/cohorts/:gemeenteCode`, `/api/data/query?references=…`, `/api/projects` CRUD.
- `useCohortMemberships` + `useDataQuery` extended with reference-series projection.
- Visual encoding standard codified in `src/client/utils/referenceSeries.ts` (a11y-distinguishable dash patterns).

## Unfinished / Next Session

| Priority | Feature | Why | Est. size |
|---|---|---|---|
| 1 | DashboardPage tile-source switch | When on `/p/:slug`, read tiles + layout from `project_dashboards` instead of system theme. Currently `/p/:slug` works but renders the system theme's tiles, not the project's clone — users won't notice for the default initial state, but project-scoped edits would not persist correctly. | M |
| 2 | "Update from theme" diff service + endpoints + UI | Theme content updates don't propagate to existing project_dashboards. Needs theme-diff service, `POST /api/projects/:id/refresh-from-theme/:dashboardId` (compute diff) + `…/apply` (apply selected entries), and a `<ThemeUpdateDiff>` modal component. | M-L |
| 3 | CustomDashboards demote-in-nav | ADR-002 mandate — move CustomDashboards out of main nav into a "Persoonlijk" submenu. Fast. | S |
| 4 | KpiStrip + GemeenteHeader integration polish | Skeleton loaders, mobile tuning, member-list side-panel. | S-M |
| 5 | CBS `86247NED` live ingest run for stedelijkheid + woningmarktregio cohorts | Code in main; needs network-reachable run. | S |

## Bugbot summary

- **PR #58 (SPEC-A)** — 2 R1 findings (counter inflation + non-deterministic ORDER BY), both fixed in branch. R2: 1 Medium (envelope `z.coerce.boolean`), shipped as #61 hotfix.
- **PR #59 (spine)** — 2 R1 findings (cohortType/envelope guard + NL legend label), both fixed. R2: 2 Medium (`useComparisonQuery` references default + dead `pickReferenceValueAtYear` consumers), addressed in cycle 5 + cycle 3 fixes.
- **PR #60 (charts)** — 3 R1 findings (HIGH wiring gap in DashboardTile + Low chip guard + Low duplicated picker), all fixed. R2: 1 Medium (expanded modal missing references), fixed.
- **PR #62 (cycle 4)** — clean.
- **PR #63 (cycle 5)** — 4 R1 (3 race conditions + 1 dead state), all fixed in branch.
- **PR #64-66** — bugbot review still settling at session end.

## Observations

- **Marathon momentum**: stacked branches worked when paired with frequent merges + rebases. The cherry-pick-after-squash-merge pattern was used several times to clean cascades.
- **Bugbot value**: caught 1 HIGH severity wiring gap that would have shipped broken (references never reaching ChartRenderer in PR #60). Clearly worth the wait per cycle.
- **Spec discipline** held: each PR description references the spec section it implements, with explicit out-of-scope notes for follow-ups.
- **CBS network** unavailable from this host throughout — the cohort sync code is verified architecturally + via populatiegrootte (which doesn't need CBS). Stedelijkheid + woningmarktregio cohorts need a network-reachable run to populate.
- **Auth using Clerk** prevented some live-curl smoke tests; relied on unit tests + structural verification instead.
- **Pre-existing AuthContext/Clerk test failures** (6) unchanged on every cycle — verified on main as well.
