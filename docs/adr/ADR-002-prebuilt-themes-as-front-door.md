# ADR-002: Prebuilt themes are the front door; customisation is a backstop

## Status
Accepted — 2026-05-09

## Context

The platform was originally framed as "an interactive, configurable dashboarding platform with RBAC/ABAC" (README, line 1). Headline features in README:

- "Configurable tile grid — Drag-and-drop layout with per-user persistence"
- "Custom Dashboards (Mijn Dashboards) — Create up to 5 personal dashboards / Add tiles from any existing theme via tile picker"

Customisation has consumed a meaningful share of investment: tile picker, drag-and-drop layout, custom dashboard sharing (30-day expiry), saved filter presets, server-backed preferences (PR #54).

In practice, the users we want to land — wethouders, beleidsmedewerkers, raadsleden at Dutch municipalities — do not arrive looking to assemble a dashboard. They arrive with a question: *"how is my gemeente doing on Wonen / Duurzaamheid / Economie, compared to peers?"* A blank-canvas customisation surface, however polished, is friction relative to a populated, opinionated, per-theme dashboard.

The supercategory + theme + tile model already in the database (migration 012) supports curated content. It is underused as a front door because the product still routes new users through configuration affordances first.

## Decision

**Prebuilt theme dashboards are the primary surface of the product. Customisation is a backstop, not the headline.**

Concretely:

1. **Headline copy** (README, AGENTS, marketing) leads with "prebuilt theme dashboards per government body, with per-municipality drilldown" — not with "interactive, configurable".
2. **Default routing.** Post-login lands the user on their org's default project's default theme dashboard (already partly done in PR #55), not on `/custom-dashboards` or an empty grid.
3. **Tile-picker & drag-and-drop** remain available but move out of the default visual hierarchy. They are accessed from "Aanpassen" / settings affordances on the prebuilt dashboard, not as the primary navigation.
4. **Mijn Dashboards / CustomDashboards** stays functional and supported but is **maintenance-only**: no new headline investment, no new entry points in the main nav, no new tile types added solely for it. New theme work is prioritised over new customisation work.
5. **New themes ship prebuilt.** A new theme is not considered shipped until it has a working prebuilt dashboard for the per-gemeente drilldown view (see ADR-003). "User can build it themselves with the tile picker" does not count.
6. **Shareable URLs and saved-filter presets** continue to work — they are how power users reach the customisation backstop without it cluttering the default surface.

## Consequences

**Positive:**
- Lower time-to-value for the target user (wethouder / beleidsmedewerker / raadslid).
- Forge cycles re-prioritise theme breadth + drilldown depth over configuration polish.
- Cohort + reference data (ADR-003) becomes a first-class concern, since prebuilt dashboards must answer "compared to whom?" out of the box.
- Sales / demo motion shifts from "look how flexible it is" to "look how immediate it is".

**Negative / accepted trade-offs:**
- Power users who liked starting from a blank canvas may experience the prebuilt default as more opinionated than they want. Mitigated by: customisation backstop is preserved; saved filters and CustomDashboards still exist.
- We accept a slower pace of new tile-type / chart-type work unless the type is needed for a prebuilt theme dashboard.

**Implementation impact:**
- README.md and AGENTS.md re-led (this PR).
- Sidebar / nav reorganised: theme tabs primary, "Mijn Dashboards" demoted (subsequent PR).
- Tile picker repositioned as in-dashboard "Aanpassen" affordance (subsequent PR).
- Forge backlog re-ranked: theme dashboards + cohort wiring before custom-dashboard enhancements.

## References

- README.md — current headline copy (pre-edit).
- `docs/PRODUCT-VISION.md` — vision this ADR enacts.
- `docs/superpowers/specs/2026-03-26-multi-domain-supercategories-design.md` — supercategory + theme model.
- ADR-003 — per-municipality drilldown with referential cohort.
- ADR-004 — theme-as-template at project creation.
