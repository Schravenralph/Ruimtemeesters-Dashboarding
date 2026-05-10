# ADR-003: Per-municipality drilldown with referential cohort is the canonical view

## Status
Accepted — 2026-05-09

## Context

A wethouder asking "how is my gemeente doing on Wonen?" does not want a row in a national table — they want their gemeente in context. The first comparison they ask for is **peers** ("how do similar gemeenten do?"), then **provincial** ("how does my province average?"), then **national** ("how does NL average?"). A single number with no reference is rarely actionable.

The platform already has:

- `geo_areas` with land / provincie / corop / gemeente / wijk / buurt levels (migration 001, 005).
- A Vergelijkingsniveau spec (`2026-03-23-primos-parity-design.md` §4) covering comparison against a *single* higher geo level (provincie or land).

What is **missing**:

- A formal notion of "referential cohort" — a set of similar municipalities the focal gemeente is compared against.
- The expectation that per-gemeente views show cohort + provincial + national reference *by default*, not as an opt-in.
- Cohort definitions as data, with provenance, so users can see *which* municipalities are in their cohort and why.

## Decision

**The canonical view of every prebuilt theme dashboard is per-municipality, with a referential cohort + provincial average + national average shown by default on every applicable chart.**

### Cohort definitions

Three cohort types ship in v1, all derivable from data we already have or can reasonably acquire. Each gemeente belongs to one cohort per cohort type.

| Cohort type | Definition | Source |
|---|---|---|
| **stedelijkheid** | CBS stedelijkheidsklasse 1–5 (zeer sterk → niet stedelijk) | CBS table (gemeente attributes) |
| **populatiegrootte** | Population-size bin: <20k, 20–50k, 50–100k, 100–250k, G4 (250k+) | Derived from `data_bevolking` totals |
| **woningmarktregio** *(per Wonen theme)* | ABF Woningmarktregio + Krimp- en anticipeerregio | ABF / CBS |

Cohort type is **per-theme overridable**: Wonen defaults to `woningmarktregio`; Duurzaamheid / Economie / Mobiliteit / Veiligheid default to `populatiegrootte`. Users can switch the active cohort type from the cohort affordance on any per-gemeente view.

### Schema

A `cohort_definitions` table (or equivalent — exact DDL deferred to the implementing TSD) stores:

- `cohort_type` (enum: stedelijkheid / populatiegrootte / woningmarktregio)
- `cohort_key` (e.g. "stedelijkheid_3", "popbin_50_100k", "wmr_amsterdam")
- `name` (human-readable label, NL)
- `geo_codes` (array of gemeente codes in this cohort)
- `source` + `source_vintage` (provenance, citable)
- `theme_default_for` (array of theme slugs where this cohort is the default — for the per-theme override)

Cohort membership is recomputed on a schedule (likely yearly) — cohorts are stable enough that ad-hoc recompute is unnecessary.

### UI defaults

For every chart on a per-gemeente prebuilt dashboard:

| Chart type | Default reference rendering |
|---|---|
| Line / Area | Solid focal gemeente line + dashed cohort-mean line + dashed provincial-mean line + dashed national line |
| Bar / Column | Focal bar coloured; reference values rendered as horizontal lines + tooltip values |
| Table / Color table | Focal row pinned at top; cohort-mean / provincial / national rows shown above the data rows, visually distinguished |
| Choropleth | Focal gemeente highlighted; cohort gemeenten outlined; legend includes cohort + national mean markers |
| KPI / Stat card | Focal value as headline; "vs cohort" and "vs NL" delta chips below |
| Pie / Radar | Cohort + national overlays where meaningful; otherwise omit references and surface a "comparison view" link |

These defaults are **on**. Users can hide reference series per chart, but the default is "show".

### What is *not* in this ADR

- **k-NN / multi-feature similarity cohorts.** Considered in scoping; deferred. The three cohort types above are explicit, citable, and good enough for v1. k-NN can be added later as a fourth `cohort_type` without schema change.
- **Cohort over time.** v1 uses current-year cohort membership for all years displayed. Time-varying cohort membership is a future extension.
- **User-defined cohorts.** Out of scope for v1. Pre-defined cohorts only.

## Consequences

**Positive:**
- Every per-gemeente view answers "compared to whom?" without user configuration.
- Cohort definitions are data, not code → adding a new cohort type or recomputing membership is an admin / sync operation, not a release.
- Provenance per cohort means every reference line is citable in a stakeholder-facing report.
- Aligns the platform with the actual question wethouders/raadsleden ask, increasing perceived value per dashboard view.

**Negative / accepted trade-offs:**
- Every chart component must know how to render reference series. Existing tiles need a one-time pass to wire reference props through.
- Extra data fetches per dashboard (cohort + provincial + national queries). Mitigated by: aggregations are pre-computed where possible; HTTP-level caching on `/api/data/query` (already used).
- Pie / Radar / some niche chart types do not gracefully accept reference series — for these, ADR accepts that we either hide the reference UI or surface a link to a separate "comparison view".

**Implementation impact:**
- Vergelijkingsniveau spec (`primos-parity-design.md` §4) is the technical starting point. This ADR extends it from "comparison against a single higher geo level" to "cohort + province + nation as defaults".
- Migration: add `cohort_definitions` table; backfill stedelijkheid + populatiegrootte cohorts from existing data; ingest woningmarktregio mapping (one-off).
- New endpoint: `GET /api/cohorts/:gemeenteCode?type=stedelijkheid` returns the cohort + members + provenance.
- Chart props: add `referenceSeries: ReferenceSeries[]` (focal already implicit; cohort / province / nation as named series).
- TSD to follow this ADR: `docs/superpowers/specs/<date>-cohort-referential-view-tsd.md`.

## References

- `docs/PRODUCT-VISION.md` — Stage 1 exit criterion is "every chart has at least one reference series".
- `docs/superpowers/specs/2026-03-23-primos-parity-design.md` §4 — Vergelijkingsniveau (single higher geo level), the predecessor design.
- `docs/primos-features.md` §18 — Primos comparison features (single comparison level only).
- ADR-002 — prebuilt themes as the front door (this ADR is the per-view shape that ADR-002 implies).
- CBS Stedelijkheid: https://www.cbs.nl/nl-nl/onze-diensten/methoden/begrippen/stedelijkheid--van-een-gebied--
- ABF Woningmarktregio's: https://www.abfresearch.nl/publicaties/woningmarktregio-2025/
