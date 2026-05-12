# Forge Spec: themes.default_cohort_type — per-theme cohort default lives on the theme

**Cycle:** 7 (this session) | **Clock:** ~3.0 h elapsed | **Size:** medium

## What

Resolves [#87](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/issues/87). Adds `themes.default_cohort_type` column, backfills it per ADR-003 (Wonen → `woningmarktregio`; all others → `populatiegrootte`), moves the API read path off `cohort_definitions.theme_default_for[]` and onto the theme's own attribute, exposes it via `ThemeConfig`, and adds a graceful runtime fallback in `CohortToggles` when the configured cohort type has no data populated yet.

Closes the slug-mismatch class of bugs identified in the Phase 1 audit (4 of 5 referenced theme slugs in `theme_default_for` don't exist; Wonen themes never get their `woningmarktregio` default).

## Why

ADR-003 §"per-theme overridable" specifies: *Wonen defaults to `woningmarktregio`; Duurzaamheid / Economie / Mobiliteit / Veiligheid default to `populatiegrootte`. Users can switch the active cohort type from the cohort affordance on any per-gemeente view.*

Audit findings (proactive-brainstorm Phase 1):
- The per-theme default is stored in `cohort_definitions.theme_default_for[]` as theme-slug arrays.
- 4 of the 5 slugs listed don't match any actual theme (e.g. `duurzaamheid-energie` doesn't exist; the real slug is `energie`).
- Only `populatiegrootte` cohort data exists; `woningmarktregio` + `stedelijkheid` are unpopulated (CBS/ABF network gap, per forge-report-2026-05-10).
- CohortToggles falls through to literal `'populatiegrootte'` for every theme, meaning Wonen silently delivers the wrong default with no audit trail.

Moving the default to a column on `themes` mirrors the universal BI-tool pattern (Tableau / Looker / Power BI / Grafana all attach defaults to the view, not the filter). Single source of truth; no slug-array drift.

## Success criteria

| # | Criterion | Verification |
|---|---|---|
| 1 | `themes.default_cohort_type` column exists and is NOT NULL | `\\d themes` |
| 2 | All 15 system themes have a populated value | `SELECT COUNT(*) FROM themes WHERE is_system AND default_cohort_type IS NULL` returns 0 |
| 3 | All 7 Wonen themes = `'woningmarktregio'` | Verify via query |
| 4 | All 7 Duurzaamheid themes = `'populatiegrootte'` (and 85640ned which is also wonen-tagged but should follow Wonen) | Verify via query |
| 5 | Cohort API endpoint's `defaultByTheme` is computed from `themes.default_cohort_type` (not from `cohort_definitions.theme_default_for[]`) | Unit test |
| 6 | `ThemeConfig` Zod contract exposes `defaultCohortType` | Type check + schema validation test |
| 7 | CohortToggles uses configured default; on missing data, falls back to `populatiegrootte` with a non-blocking tooltip | Manual smoke + unit test of the picker logic |
| 8 | Migration is idempotent | Re-apply produces `UPDATE 0` |

## Approach

### Migration 029

```sql
ALTER TABLE themes
  ADD COLUMN IF NOT EXISTS default_cohort_type VARCHAR(50) NOT NULL DEFAULT 'populatiegrootte';

-- Wonen-supercategory themes default to woningmarktregio per ADR-003.
UPDATE themes
SET default_cohort_type = 'woningmarktregio'
WHERE supercategory = 'wonen'
  AND is_system = true;
```

(No explicit Duurzaamheid UPDATE needed — the column DEFAULT plus the existing tagging covers them.)

### Server changes

- `cohort.controller.ts`: change the `defaultByTheme` builder to query `themes` instead of `cohort_definitions.theme_default_for`.
- `theme.controller.ts` (or wherever themes get serialised): include `default_cohort_type` in the response as `defaultCohortType`.
- `ThemeConfig` Zod contract gains `defaultCohortType: CohortType.default('populatiegrootte')`.

### Client changes

- `CohortToggles.tsx`: fall through to `theme.defaultCohortType` (instead of a hard-coded `'populatiegrootte'` literal). The `memberships` payload is still the source of truth for *which cohorts have data*; the configured default is the *desired* one. Picker behaviour:
  1. If a presentation override is set, use it.
  2. Else use `theme.defaultCohortType`.
  3. If the chosen type has no membership in the API response, fall back to `populatiegrootte` and surface a tooltip explaining ("`woningmarktregio` nog niet geladen").

### Tests

- Server: `cohort.controller.test.ts` covers `defaultByTheme` is populated from theme column.
- Pure helper for the picker fallback rule in CohortToggles, unit-tested.

## Validation plan

1. Apply migration → query the 4 success criteria SQL checks → confirm 15:0:7:8 (15 with type, 0 nulls, 7 Wonen with woningmarktregio, 8 non-Wonen with populatiegrootte).
2. `pnpm vitest run` → suite stays green; new tests pass.
3. Idempotent re-apply → `UPDATE 0` on the Wonen UPDATE.
4. Visual smoke: open per-gemeente drilldown on a Wonen project → CohortToggles shows "Populatiegrootte" with tooltip "woningmarktregio nog niet geladen" (manual; same auth-setup constraint as cycles 3 + 5; document if not run).

## Comparison vs alternative

vs. **fixing `theme_default_for` slug arrays in place**:
- Slug fix: tactical, doesn't change the "data lives on cohort, not theme" inversion. Every new theme requires editing existing cohort_definition rows. Brittle.
- Column on theme: structural fix, captures intent, scales to N themes.

Picked the column. Slug-array path is rejected.

## Not doing

- **Populating `woningmarktregio` or `stedelijkheid` cohort_definitions**. Needs CBS/ABF network access (forge-report-2026-05-10 notes this is environment-dependent). Schema captures the intent; data load is separate.
- **Removing `cohort_definitions.theme_default_for[]`**. Leaving it untouched (it's mostly empty anyway). A follow-up cleanup PR can drop it once nothing reads it.
- **k-NN / user-defined cohorts**. Explicit ADR-003 v1 non-goal.

## Baseline → Expected after

| Metric | Before | After |
|---|---|---|
| Themes with explicit `default_cohort_type` | 0 / 15 | **15 / 15** |
| Wonen themes correctly defaulting to `woningmarktregio` | 0 / 7 | **7 / 7** (in config; runtime falls back gracefully until data lands) |
| Duurzaamheid themes correctly defaulting to `populatiegrootte` | 7 / 7 (coincidentally, via fallback) | 7 / 7 (now intentional, not coincidental) |
| Slug-mismatch class of bugs | open | **closed** |
| Source of truth for per-theme default | `cohort_definitions.theme_default_for[]` (broken) | `themes.default_cohort_type` (typed column) |

**Timer: 30 min** — proceeding under silence-means-approval, user can interject before PR push.
