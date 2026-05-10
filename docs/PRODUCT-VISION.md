# Product Vision — Ruimtemeesters Dashboarding

**Last updated:** 2026-05-09
**Status:** Active

This document is the single source of truth for *what we are building, why, and in what order*. It sits above the design specs in `docs/superpowers/specs/` and the ADRs in `docs/adr/`. When forge cycles, sprints, or PRs need to justify their direction, they point here.

---

## Vision

Ruimtemeesters Dashboarding is a **prebuilt, theme-driven dashboarding platform for Dutch governments** — primarily municipalities, with provincial and national rollups. The core surface is a curated set of **per-theme, per-government-body dashboards** (Wonen first, then Duurzaamheid, Economie, Mobiliteit, Veiligheid). The canonical view is **the municipality, in context** — every metric is shown alongside a referential cohort (similar municipalities) and the provincial + national average — so a wethouder, beleidsmedewerker, or raadslid can answer "how are we doing, compared to whom?" in one screen.

Customisation (custom dashboards, custom tiles, ABAC policies) remains, but it is a *backstop* for advanced users — not the front door.

## Ambitions (6–12 month horizon)

1. **Prebuilt over blank canvas.** A new user lands on a meaningful, populated dashboard for their gemeente within seconds of signing in — not on an empty grid with a "+ add tile" button.
2. **Municipality-as-protagonist.** Every theme has a per-gemeente landing view that includes the referential cohort + provincial + national reference lines as standard, not as an opt-in.
3. **Theme-as-template.** Creating a new project = picking a theme. The platform auto-subscribes the org to the theme's data sources, copies the theme's prebuilt dashboards, and lands the user in them.
4. **Wonen first, breadth next.** Wonen / Volkshuisvesting reaches "comparable to Primos for the gemeente-drilldown use case" before we add depth to Duurzaamheid, Economie, Mobiliteit, Veiligheid.
5. **Defensible referential cohorts.** Cohort definitions (CBS stedelijkheidsklasse, population-size bin, ABF Woningmarktregio, Krimp- en anticipeerregio) are explicit, citable, and per-theme overridable — not a black box.

## Programmes (parallel work-streams)

These are the durable threads that span sprints. Each maps to existing or new design specs in `docs/superpowers/specs/`.

| Programme | Goal | Status | Anchored by |
|---|---|---|---|
| **PROG-THEMES** | Prebuilt theme dashboards as the front door, starting with Wonen. | Active | ADR-002, `2026-03-26-multi-domain-supercategories-design.md` |
| **PROG-DRILLDOWN** | Per-municipality drilldown with referential cohort + provincial + national reference. | Active | ADR-003, `2026-03-23-primos-parity-design.md` (§4 Vergelijkingsniveau) |
| **PROG-PROJECTS** | Project entity (many-per-org); theme-as-template bootstrap. | New | ADR-004 |
| **PROG-DATA** | Pluggable CBS sync, data-source registry, sync schedules. Already in flight. | Active | `2026-03-26-multi-domain-supercategories-design.md` (§4) |
| **PROG-FORECAST** | TSA forecasting (`ruimtemeesters_prognose` source). | Paused | `2026-03-23-tsa-engine-design.md` |
| **PROG-CUSTOM** | Custom dashboards, tile picker, sharing. **Maintenance only** — no new headline investment. | Maintenance | README "Custom Dashboards" section |
| **PROG-ADMIN** | Org admin, user mgmt, ABAC, data-quality, audit. | Active | Datakwaliteit (PR #56), AdminPage |

Cross-programme: every programme owes PROG-DRILLDOWN a per-gemeente entry point. A new theme is not "shipped" until it has a gemeente landing view with cohort + provincial + national reference.

## Roadmap

**Stage 1 — Wonen as the reference implementation (now → next 2 forge sessions).**
Wonen has all 5 prebuilt dashboards (Overzicht, Bevolking, Huishoudens, Woningen, Woningtekort) usable in a per-gemeente drilldown with cohort + provincial + national reference visible by default. Vergelijkingsniveau (Primos-parity §4) ships. Cohort definitions exist as data (`cohort_definitions` table or equivalent — see ADR-003).
*Exit criterion:* a user picks a gemeente, sees 5 working dashboards, every chart has at least one reference series.

**Stage 2 — Project entity + theme-as-template bootstrap.**
`projects` table; `org → projects → theme + dashboards + subscriptions` model lands. New-project flow asks "which theme?" and provisions everything. Existing CustomDashboards retained but visually subordinated.
*Exit criterion:* an admin can spin up a new project ("Woonzorgvisie 2030") in under a minute, fully populated.

**Stage 3 — Duurzaamheid as the second prebuilt theme.**
Apply the Wonen template to Duurzaamheid: prebuilt per-gemeente dashboards across Energie, Emissies, Hernieuwbaar, Afval. Cohort + reference lines work the same.
*Exit criterion:* a Duurzaamheid project is indistinguishable in shape from a Wonen project, just different content.

**Stage 4 — Economie, Mobiliteit, Veiligheid (in priority order).**
Each new theme = data-source registration (sync_config) + prebuilt theme + tiles + cohort wiring. The project-template machinery means each new theme is a content drop, not a platform change.

**Stage 5 — Forecast layer (TSA).**
Ruimtemeesters-prognose source goes live across themes that have meaningful forecastable series. Confidence bounds visible per gemeente.

## Non-goals

- **Generic BI tool.** We are not Tableau / Looker / Power BI. The prebuilt layer is the value; pivot tables and freeform query are deliberately not the front door.
- **Primos clone.** Primos is the reference for Wonen parity, not the ceiling. We extend (cohort, project entity, multi-theme) rather than replicate (Swing Viewer chrome, presentation tabs as the primary nav).
- **National-only view.** Anything that only makes sense at national level without a meaningful gemeente drilldown is out of scope until proven otherwise.
- **Anonymous public dashboarding.** Sharing exists; unauthenticated open data portals do not.
- **Customisation-first onboarding.** A new user does not see "+ add tile" before they see a working dashboard.

## Glossary

- **Theme** — a curated content area inside a supercategory (e.g. "Bevolking" inside "Wonen"). Has tiles + a default dashboard.
- **Supercategory** — top-level domain (Wonen, Duurzaamheid, Economie, …). Maps 1:1 to nav tabs.
- **Project** — a per-org workspace bound to one theme at creation, containing dashboards + the org's data-source subscriptions for that theme. See ADR-004.
- **Cohort** — the set of municipalities a given gemeente is referentially compared against. See ADR-003 for definitions.
- **Referential view** — any chart that shows the focal gemeente alongside cohort, provincial, and national reference series.
- **Data source registry** — `data_sources` table; the canonical list of (key, table, sync_config). Migration 012.
- **Subscription** — `data_source_subscriptions` row; an org's commitment to a data source. Migration 016.

## Cadence

- Vision review: per major release or when a forge session uncovers material drift.
- Programme review: per session-close.
- Roadmap stage exit: declared in a session report (`docs/superpowers/forge-report-*.md`).
