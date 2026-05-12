-- ADR-006 — sync demand requests table. Per the global-pull invariant
-- (memory: project_data_pull_vs_view), NO organization_id column.
--
-- Aggregator + endpoints land in separate PRs (EPIC #108 children #101-#102).

CREATE TABLE IF NOT EXISTS sync_demand_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_key   VARCHAR(255) NOT NULL REFERENCES data_sources(key),
  requested_cron    VARCHAR(255) NOT NULL,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dashboard_context JSONB,
  expires_at        TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Aggregator hot path: pull all non-expired demands per data_source_key.
CREATE INDEX IF NOT EXISTS idx_sync_demand_aggregator
  ON sync_demand_requests(data_source_key, expires_at);

-- Decay job hot path: find demands tied to inactive dashboards.
CREATE INDEX IF NOT EXISTS idx_sync_demand_dashboard
  ON sync_demand_requests((dashboard_context->>'project_id'), expires_at)
  WHERE dashboard_context IS NOT NULL;
