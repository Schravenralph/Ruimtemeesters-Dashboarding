# ADR-005: User templates carve-out from ADR-002

## Status
Accepted — 2026-05-12

## Context

ADR-002 (2026-05-09) framed customisation as maintenance-only:

> *"Customisation is a backstop, not the headline. […] Mijn Dashboards / CustomDashboards stays functional and supported but is maintenance-only: no new headline investment."*

On 2026-05-12 the user (product owner) reaffirmed during a session that personal saved-templates should be a first-class concept, despite the surface tension with ADR-002. Reasons:

1. **Supply problem.** The platform ships with 15 system theme templates. New theme content is bottlenecked on engineering. User-created templates expand supply over time without engineering-cycle cost.
2. **Promotion path.** A great user template can be promoted by an org admin to org-template visibility, and by a platform admin to a `dashboard_templates` row — converting user creativity into prebuilt content. Customisation becomes a *source* of prebuilt content, not a competitor to it.
3. **Distinct from CustomDashboards.** The existing `custom_dashboards` table holds **dashboards-as-views**: a user's actual working dashboard. A `user_template` is **a reusable starting point** for new-project bootstrap — a different concept that does not exist today.

The 2026-05-12 session captured the binary choice via AskUserQuestion: "Starter packs (admin-curated)" vs. "Personal templates (Mijn templates)" vs. "Org-templates only" vs. "Defer". The user chose **Personal templates (Mijn templates)**, accepting the ADR-002 tension explicitly and authorizing this carve-out.

## Decision

**User templates are a first-class concept distinct from system theme templates (`dashboard_templates`) and personal dashboards (`custom_dashboards`).**

Concretely:

1. **Storage:** new `user_templates` table (migration 030). Schema in §"Schema" below.
2. **Ownership:** a template is owned by the user who created it (`user_id`), and scoped to the user's org (`organization_id`).
3. **Visibility tiers:** every user_template has one of three visibilities:
   - `private` — only the owner sees it (in the new-project wizard's "Mijn" tab)
   - `org` — visible to all members of the owner's org (in the wizard's "Org" tab)
   - `public` — visible to all authenticated users platform-wide (in the wizard's "Publiek" tab)
4. **RBAC:** owner can edit name/description/visibility/tiles/layout. Owner OR org-admin can change visibility for org-visible templates. Platform admin can promote any user_template into `dashboard_templates` (system template).
5. **Project bootstrap integration:** the existing 3-step new-project wizard (ADR-004) gains tabs `Systeem` / `Mijn` / `Org` / `Publiek` in step 1. Selecting any of them clones tiles + layout into `project_dashboards` via the same atomic bootstrap path.
6. **Promotion path:** explicit gestures, audit-logged. A user can publish private → org. An org admin can leave it private/org or request promotion to system. A platform admin can convert a high-quality user_template into a `dashboard_templates` row (system template), retaining attribution.

### Relationship to ADR-002

This ADR **carves out an exception** to ADR-002's maintenance-only stance. ADR-002 remains Accepted with respect to the original customisation surface (tile picker, drag-and-drop layout, Mijn Dashboards). User templates are explicitly NOT covered by that maintenance-only rule because they:

- Increase prebuilt content supply (the *promotion path* converts customisation work into prebuilt assets over time).
- Reduce the time-to-value for users who want to share or reuse a dashboard configuration (replacing ad-hoc messaging/screenshots).
- Sit upstream of project bootstrap (ADR-004) rather than competing with the prebuilt-themes front door (ADR-002).

ADR-002 gets a footer pointer to this ADR; the relevant clause is not superseded, just *exempted* for the user-templates sub-surface.

### Schema (migration 030)

```sql
CREATE TYPE user_template_visibility AS ENUM ('private', 'org', 'public');

CREATE TABLE user_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              VARCHAR(255) NOT NULL,
  description       TEXT,
  source_theme_slug VARCHAR(255) REFERENCES themes(slug),
  tiles             JSONB NOT NULL DEFAULT '[]'::jsonb,
  layout            JSONB NOT NULL DEFAULT '[]'::jsonb,
  visibility        user_template_visibility NOT NULL DEFAULT 'private',
  version           INT NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_templates_user ON user_templates(user_id);
CREATE INDEX idx_user_templates_org_visibility
  ON user_templates(organization_id, visibility)
  WHERE visibility IN ('org', 'public');
CREATE INDEX idx_user_templates_public
  ON user_templates(visibility)
  WHERE visibility = 'public';
```

Indexing rationale: the wizard tabs query by `(user_id)` for "Mijn", by `(organization_id, visibility = 'org')` for "Org", and by `(visibility = 'public')` for "Publiek". Partial indexes keep the hot paths fast without bloating storage for the dominant `private` rows.

### What is NOT in this ADR

- **Endpoint surface** (`POST /api/user-templates`, etc.) — covered by EPIC #107 children #93–#96, each a separate cycle.
- **UI for the wizard tabs + the "Save as template" affordance** — also EPIC #107 children, separate cycles.
- **Promotion audit log schema** — deferred; a follow-up ADR when promotion is actually built. v1 can use existing audit tables.
- **Cross-org templates** — a user belongs to one org; `organization_id` is non-null. Public templates are visible *across* orgs but still *owned by* one. No cross-org ownership transfer in v1.
- **Template versioning beyond `version INT`** — a single numeric counter is sufficient for v1; semver / branching is over-engineering until proven needed.
- **Deletion semantics for templates referenced by promoted system templates** — a follow-up ADR if promotion goes through; for v1, system templates are independent copies (ADR-004 semantics already handle this).

## Consequences

**Positive:**
- User-created content scales template supply without engineering cycles.
- Three-tier visibility matches the universal pattern in Tableau / Looker / Power BI / Grafana / Mode.
- Promotion path turns customisation into prebuilt content (the ADR-002 spirit holds: prebuilt is still the front door; user-templates feed it).

**Negative / accepted trade-offs:**
- A new top-level concept ("user template") that overlaps lexically with "system template" (`dashboard_templates`) and "personal dashboard" (`custom_dashboards`). Mitigated by: explicit naming in the UI ("Templates" vs. "Dashboards"), distinct tables, this ADR.
- ABAC/RBAC complexity grows: visibility rules need to be enforced on every read endpoint. Mitigated by: partial indexes + a centralised visibility-check helper in the service layer (to be built in EPIC #107 children).
- Promotion adds audit/governance load. Acceptable — promotion is rare and admin-gated.

**Implementation impact:**

1. Migration 030 (this ADR) — schema only, no endpoints.
2. EPIC #107 children #93 (Save-as-template affordance), #94 (wizard tabs), #95 (org-template sharing), #96 (template promotion) — each separate PR.
3. README + AGENTS get a brief mention that user templates exist.
4. ADR-002 gets a "Subsequent decisions" footer pointing here.

## References

- ADR-002 — Prebuilt themes as the front door (this ADR carves out an exception).
- ADR-004 — Theme-as-template on project bootstrap (project wizard gains new template sources from this ADR).
- EPIC issue #107 — User templates programme.
- 2026-05-12 session AskUserQuestion choice: "Personal templates (Mijn templates)" (binding to user_templates_as_customisation_expansion memory: `project_2026_05_12_subscriber_decisions.md`).
- Industry pattern: Tableau workbooks / Looker dashboards / Mode reports — 3-tier visibility (private / team / public) is universal.
