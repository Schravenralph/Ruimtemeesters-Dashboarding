-- Drop data_source_subscriptions.custom_filters.
--
-- The column was introduced in migration 016 with the comment
-- "Org-specific overrides (year range, region filter)". That encodes the
-- forbidden model of per-org data filtering. Data pulling is GLOBAL —
-- there is one canonical fleet of sync_schedules and every row they pull
-- is shared across all orgs. Orgs only gate VIEWING via sync_enabled.
--
-- The column was never read or written by any code path (grep confirms
-- the only reference was a SELECT in catalog.routes.ts that propagated
-- the empty JSONB into responses without any consumer). Removing it
-- makes the schema match the invariant and prevents future PRs from
-- repurposing it the wrong way.
--
-- Subsetted pull rules live on sync_schedules.subset_filters (added in
-- a later PR), where they belong — global constraints, not per-org.

ALTER TABLE data_source_subscriptions DROP COLUMN IF EXISTS custom_filters;
