-- User-definable CBS sync schedules.
-- Each row defines when to re-sync a given data source, and who to notify.
CREATE TABLE IF NOT EXISTS sync_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_key VARCHAR(50) NOT NULL REFERENCES data_sources(key) ON DELETE CASCADE,
  cron_expression VARCHAR(100) NOT NULL,        -- e.g. '0 3 * * *' (daily 03:00)
  timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/Amsterdam',
  year_filter INTEGER,                           -- optional: restrict sync to a single year
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  notify_email BOOLEAN NOT NULL DEFAULT true,
  notify_in_app BOOLEAN NOT NULL DEFAULT true,
  notify_on VARCHAR(20) NOT NULL DEFAULT 'failure', -- 'always' | 'failure' | 'never'
  last_run_at TIMESTAMPTZ,
  last_run_status VARCHAR(20),
  last_run_id UUID REFERENCES sync_runs(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(data_source_key, cron_expression)
);

CREATE INDEX IF NOT EXISTS idx_sync_schedules_enabled ON sync_schedules(is_enabled) WHERE is_enabled = true;

-- Seed notification preference event types for the users table so the existing
-- notification_preferences UI has something to toggle.
-- (No rows inserted here — created on-demand per user.)
