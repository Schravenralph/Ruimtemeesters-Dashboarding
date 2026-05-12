-- ADR-006 — sync subscribers. Who/what to notify on sync events
-- (frequency_changed, data_arrived). Notification delivery lands in
-- EPIC #108 child #103.

CREATE TABLE IF NOT EXISTS sync_subscribers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_kind   VARCHAR(20) NOT NULL CHECK (subscriber_kind IN ('user', 'project_dashboard')),
  subscriber_id     UUID NOT NULL,
  data_source_key   VARCHAR(255) NOT NULL REFERENCES data_sources(key),
  notification_pref JSONB NOT NULL DEFAULT '{"in_app": true, "email": false, "events": ["data_arrived","frequency_changed"]}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (subscriber_kind, subscriber_id, data_source_key)
);

-- Notification delivery hot path: fan out by data_source on event.
CREATE INDEX IF NOT EXISTS idx_sync_subscribers_by_source
  ON sync_subscribers(data_source_key);
