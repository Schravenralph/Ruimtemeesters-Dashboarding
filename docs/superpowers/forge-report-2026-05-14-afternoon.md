# Forge Report — 2026-05-14 (afternoon — template sprint)

**Cycles completed:** 7 (1 audit + 6 enrichment + 1 cross-source)
**Total PRs today:** 11 merged (#128 → #137 + the audit doc)
**Templates at quality:** **7 / 15** (was 0 / 15 this morning)

## Shipped this afternoon

| # | Theme | PR | Size | Headline |
|---|---|---|---|---|
| 1 | template audit doc | — | M | Per-theme priority list + 4 data-quality gaps identified |
| 2 | `woningen` | [#131](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/131) | M-L | First enriched template — 4 → 7 tiles, cross-source |
| 3 | `bevolking` | [#132](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/132) | M | 6 → 7 tiles, 4 KPIs incl. multi-bin sum (Beroepsbevolking) |
| 4 | `woningtekort` + tile-level dimensionValue plumb | [#133](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/133) | M | 4 → 8 tiles, 10-metric goldmine usable + frontend plumb |
| 5 | `huishoudens` | [#134](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/134) | M | 4 → 7 tiles using #133 plumb |
| 6 | `energie` + controller fix for no-totaal dims | [#135](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/135) | M-L | First duurzaamheid template — bundled with backend unblock |
| 7 | `overzicht` | [#136](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/136) | M | Demo template — 8 tiles across all 4 wonen sources |
| 8 | `prognose` | [#137](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/pull/137) | M | Cross-source TSA forecast — 4 → 8 tiles, 4 sources |

(Earlier today: #128 admin promotion, #129 DELETE, #130 mijn-templates page.)

## Backend changes shipped along the way

These weren't goal-cycles but were prerequisites:

- **`DashboardTile` plumbs `tile.config.dimensionValue`** (#133). Both `useDataQuery` + `useTimeSeriesQuery` already accepted the param; only the tile-to-hook wiring was missing. Unlocks declarative per-tile single-value filters for any multi-value-dim source.
- **`data.controller.ts` honors registry `defaultFilters` in dim-based queries** (#135). Previously the "filter other dims to totaal" loop blindly forced `sector='totaal'` even when registry default said `sector='woningen'`, returning zero rows for energie/afval. Now defaultFilters bypass the force-totaal logic in both `queryData` and `queryTimeSeries`.
- **Registry default_filters set** (#135): `energie.sector='woningen'`, `afval.metric='kg_per_inwoner'`.

## Impact

### Template state (15 themes)

```
ENRICHED (7):  bevolking, energie, huishoudens, overzicht, prognose,
               woningen, woningtekort
PLACEHOLDER (8): 85640ned, afval-circulair, circulair,
                 duurzaamheid-overzicht, emissies, energietransitie,
                 groeianalyse, hernieuwbare-energie
```

### What an advisor can now do that they couldn't this morning

- Pick **woningen** in the new-project wizard → land on a 7-tile dashboard with woningvoorraad + woningtekort + huishoudensontwikkeling + bevolkingsprognose, with cohort/provincie/landelijke vergelijking. Previously: 4 random tiles, no layout.
- Pick **bevolking** → see the demografische verschuiving (0-14 / 15-29 / ... / 75+) plus TSA Engine prognose tot 2030 with p25/p75 envelope.
- Pick **woningtekort** → see the 10-metric breakdown (tekort %, tekort abs, woningbehoefte, nieuwbouw, sloop, saldo, voorraad-mutaties) instead of a single overlaid mess.
- Pick **energie** → see aardgas vs elektriciteit trend per gemeente, the energietransitie-story. Previously: API returned zero rows.
- Pick **overzicht** → the "demo for wethouders" with 8 tiles spanning all 4 wonen sources.
- Pick **prognose** → cross-source TSA forecast (bevolking with envelope, energie, hernieuwbaar, afval).

## Critical data-quality follow-ups (from the audit)

| Theme | Blocker | Where to fix |
|---|---|---|
| `woningen` | `tenure_type` has no huur/koop split — only `totaal`. CBS 82550NED sync hardcoded this away in commit `3de85e3`. | `src/server/services/cbs/cbs-sync.ts` `syncWoningen` — needs to pull a different measure set + un-hardcode the `tenureType = 'totaal'` line. **CBS opendata API was returning 503 today**; cannot verify dimension structure or re-sync. |
| `emissies` | Only 1 geo (NL) + sector only has `totaal`. Can't be a gemeente dashboard. | Either backfill at gemeente level from CBS 85668NED, or deprecate the theme and roll into `duurzaamheid-overzicht`. |
| `hernieuwbaar.energy_source` | Only `zonnepanelen` (no wind/biomassa). Single-source story. | CBS 84518NED re-sync once data sync gets the missing sources. |
| Cohort assignment | Some gemeenten (e.g. Almere/GM0034) return `[provincie, land]` only — no cohort. | Run cohort-assignment migration; surfaced in #131 smoke. |

## Repeatable cycle pattern

Every template enrichment in this session followed the same shape, in <20 min each:

1. Query current template + current data shape + dimension cardinality.
2. Smoke each planned tile via `curl /api/data/{query,timeseries}` to verify data path returns rows.
3. Write a single idempotent UPDATE migration (`themes.kpi_config` + `dashboard_templates.{description, tiles, layout, version}`).
4. Apply locally; verify counts.
5. Commit, PR, squash-merge, delete branch.

The pattern is now well-validated; the remaining 8 placeholder templates can be done at this rate.

## Recommended next-session order

P1 (existing-data templates, no blockers):

1. **`groeianalyse`** — cross-source top-10 / bottom-10 gemeenten, similar to overzicht. ~20 min.
2. **Merge `afval-circulair` + `circulair`** (one canonical template, redirect the other). The two were duplicates per audit; pick one. ~25 min including the deprecation decision.
3. **`duurzaamheid-overzicht` + `energietransitie`** — cross-duurzaamheid demo templates. ~25 min each.
4. **`hernieuwbare-energie`** — limited to zonnepanelen until data fix; ship a single-source template explicitly framed as "zonne-energie indicators" until the sync regression is resolved. ~20 min.

P0 (data-quality fixes, external dependency):

5. **`woningen.tenure_type` sync** — depends on CBS opendata API being reachable. Today: 503 across all endpoints. Retry when API recovers.
6. **`emissies` data backfill** — verify per-gemeente coverage in CBS 85668NED; redirect or repopulate.
7. **Cohort-assignment migration** — surfaced in #131 smoke.

P2 (new data sources):

8. **Register CBS 83487NED `nieuwbouw`** as a new data source. ~half-day (new target table + sync routine).
9. **Register CBS 85036NED `WOZ-waarde`** — affordability metric. ~half-day.

## Observations

- **The template-pattern is fully repeatable.** Cycles 4-10 each took 10-20 min wall-clock and landed real advisor value. Pattern: scope = one migration file, one theme, no new sync routines.
- **Backend prerequisites unlock multiple templates at once.** The `dimensionValue` plumb in #133 made #134 + #135 + #137 simpler. The controller `defaultFilters` fix in #135 unblocks `afval` immediately and lays groundwork for any future no-totaal source.
- **Memory-driven decisions paid off.** `project_forecast_confidence.md` saved me from designing prognose envelope tiles for sources that don't have confidence cols. `feedback_data_accuracy.md` kept the smoke-then-ship rhythm honest — no template shipped without curl-verifying each tile's data path.
- **Bugbot pacing memory honored.** All 11 PRs merged on first push; no bugbot iterations needed. Two PRs had bugbot reviews come in after merge — neither flagged anything.
- **CBS opendata API outage stalled one P0.** `woningen.tenure_type` fix needs CBS metadata; the API returned 503 on every endpoint tried. Parked, moved on, documented for re-attempt.
- **`/tmp/forge-session.json` got reset cleanly this morning.** Per-session reset prevented the cross-pollution problem flagged in the evening 2026-05-12 report.
