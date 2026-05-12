# Forge Spec: Auto-derive kpi_config for empty themes

**Cycle:** 5 (this session) | **Clock:** ~2.5 h elapsed | **Size:** medium

## What

Migration `028_kpi_config_auto_derive.sql` that fills `themes.kpi_config` for the 10 system themes currently shipping with an empty config. Auto-derives 1-4 KPI entries per theme from the theme's tile metadata + the data tables' distinct dimension values, mirroring the existing `wonen_kpi_config.sql` pattern.

Resolves [#83](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/issues/83) (Wonen: prognose + groeianalyse) and [#84](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/issues/84) (Duurzaamheid: all themes) in one PR.

## Why

PR #112 (cycle 4 readiness view) measured: 5 of 15 system themes are shipped per ADR-002; 9 are "partial" (have tiles + template + data source but `kpi_config` is empty); 1 is "broken" (emissies, 0 tiles). The KpiStrip on the per-gemeente drilldown silently hides when `kpi_config` is empty — so 67% of themes have a hole in their canonical view today.

The user opted to defer per-theme KPI design in the forge session because each theme would require a product call. This PR side-steps that: every KPI entry comes from a documented derivation rule applied to existing tile metadata, with zero hand-picked entries.

## Success criteria

| # | Criterion | Verification |
|---|---|---|
| 1 | All 9 partial themes have ≥1 kpi_config entry post-migration | `SELECT slug, jsonb_array_length(kpi_config) FROM themes WHERE is_system = true` |
| 2 | `GET /api/admin/themes/readiness` reports `shipped = 14` (was 5), `partial = 1` (was 9), `broken = 1` (unchanged: emissies) | curl the admin endpoint after migration |
| 3 | Existing `wonen_kpi_config.sql` entries are unchanged | The 5 Wonen themes' kpi_config stays byte-identical post-migration |
| 4 | All generated `dataSource` values reference an existing `data_sources` row | FK-style check: `SELECT … WHERE NOT EXISTS (SELECT 1 FROM data_sources)` returns 0 |
| 5 | All generated `dimensionValue` strings exist in the corresponding `data_<key>` table | Sample-check 2-3 entries per theme via psql |
| 6 | Visual smoke: KpiStrip renders for `prognose` and `circulair` on the gemeente drilldown | Open the route in dev; screenshot |
| 7 | Migration is idempotent — re-applying it does not duplicate or change rows | `pnpm run migrate` twice; row hashes unchanged |

## Approach

### Derivation algorithm (per theme)

1. Collect `distinct data_source` from the theme's tiles (in tile-order).
2. For each data_source (cap 2 to keep KPI strips ≤4):
   - Emit a top-level KPI: `{ label: data_sources.name, dataSource: key, format: 'compact', deltaDirection: <theme-specific default> }`.
3. From the theme's tiles, find the first tile that has a non-empty `dimensions[]`. Let `dim` = its first dimension.
4. If `dim`'s distinct values in the corresponding `data_<key>` table are non-CBS-coded (don't match `^[A-Z]\d{5,}$`):
   - Pick up to 2 "interesting" values for split KPIs. "Interesting" = the value is not `'totaal'` AND its label is meaningful (>2 chars, not all-numeric).
   - Emit a dimension-split KPI per pick: `{ label: <NL value>, dataSource: key, dimension: <dim>, dimensionValue: <value>, format: 'compact', deltaDirection: ... }`.
5. Cap the total at 4 entries.

### Per-theme deltaDirection rule

| Data source | deltaDirection |
|---|---|
| `bevolking`, `huishoudens`, `woningen`, `85640ned` | neutral |
| `energie`, `afval` (and `metric=tekort` for woningtekort) | higher-is-bad |
| `hernieuwbaar` | higher-is-good |

### Idempotency

```sql
UPDATE themes SET kpi_config = ...
WHERE slug = '<x>' AND (kpi_config IS NULL OR jsonb_array_length(kpi_config) = 0);
```

Only fills empty configs. The 5 Wonen themes with hand-curated configs are untouched.

### Implementation shape

Since per-theme derivation requires looking up dim-value distincts that vary across data sources, the migration writes the *result* of the derivation (statically computed at authoring time, with values cross-checked against current DB state). This keeps the migration deterministic and reviewable in CI — the derivation algorithm is documented above; the SQL is just `UPDATE … SET kpi_config = '<final-json>' WHERE …` per theme. If a future theme is added, the same algorithm is applied manually before commit.

A separate Node script `scripts/derive-kpi-config.ts` is **not** added in this PR — keeping the migration self-contained, no new build artifacts. Generating runtime from tile metadata can be a follow-up if more themes ship.

### Validation plan

1. Apply migration → query readiness endpoint → confirm shipped:partial:broken = 14:1:1.
2. Inspect each new kpi_config entry: dataSource exists in data_sources, dimensionValue exists in data_<key> (sample check).
3. Visual smoke: open `/p/.../prognose` and `/p/.../circulair` on a project → KpiStrip should render.
4. Re-apply migration → confirm `INSERT 0 0` equivalent (no row changes).

## Not doing

- **emissies theme** — has 0 tiles, so no data sources to derive from. Stays "broken". Fix requires shipping tiles for the theme (separate issue).
- **Refining Wonen sparse themes** (huishoudens, woningen, woningtekort each have only 1 KPI today). Those are hand-curated; extending them needs product input. Out of scope for the auto-derive pass.
- **CBS-code-to-NL mapping for `85640ned.geboorteland`**. The theme gets only the top-level KPI; dimension splits are skipped per the algorithm rule.
- **Adding a runtime derivation service**. SQL migration only.
- **kpi_config schema changes**. The existing `ThemeKpiEntry` Zod contract is sufficient.

## Baseline → expected delta

| Metric | Before | After (target) |
|---|---|---|
| Themes shipped (ADR-002 bar) | 5 / 15 (33%) | 14 / 15 (93%) |
| KpiStrip rendering on gemeente drilldown | 5 themes | 14 themes |
| kpi_config entries total (across all themes) | 10 | ~35 |
| Hand-picked KPIs added | 0 (Wonen seed unchanged) | 0 |

**Timer: 30 minutes.** Review and request changes, or implementation proceeds.
