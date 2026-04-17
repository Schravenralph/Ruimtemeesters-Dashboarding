-- Audit log for every CBS sync attempt. Makes silent failures visible.
CREATE TABLE IF NOT EXISTS sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_key VARCHAR(50) NOT NULL,
  cbs_table_id VARCHAR(20),
  trigger VARCHAR(20) NOT NULL,                -- 'manual' | 'scheduled' | 'activation'
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'running', -- 'running' | 'success' | 'partial' | 'failed'
  rows_fetched INTEGER DEFAULT 0,
  rows_inserted INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  triggered_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_source_started ON sync_runs(data_source_key, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_runs_status ON sync_runs(status) WHERE status != 'success';

-- Relax FK on dynamically-activated data tables: activation now creates tables
-- without a hard FK to geo_areas, because CBS uses region codes (PC4, CR, BU)
-- that aren't pre-loaded in geo_areas. Data is still validated by the generic
-- sync engine's region parser.
-- `ALTER TABLE IF EXISTS` is a no-op on fresh deployments where the 85640ned
-- data source was never activated (the table won't exist there).
ALTER TABLE IF EXISTS data_85640ned DROP CONSTRAINT IF EXISTS data_85640ned_geo_code_fkey;
