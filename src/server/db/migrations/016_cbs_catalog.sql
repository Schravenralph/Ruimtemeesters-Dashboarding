-- CBS StatLine Catalog Cache
-- Stores metadata for all ~5,900 CBS tables, synced from the OData catalog.
-- This is the browsable "data marketplace" for administrators.

CREATE TABLE IF NOT EXISTS cbs_catalog (
  id SERIAL PRIMARY KEY,
  identifier VARCHAR(20) NOT NULL UNIQUE,     -- CBS table ID, e.g. '03759ned'
  title TEXT NOT NULL,                         -- Full Dutch title
  short_title TEXT,                            -- Abbreviated title
  summary TEXT,                                -- One-line summary
  frequency VARCHAR(30),                       -- 'Perjaar', 'Perkwartaal', 'Permaand', 'Stopgezet'
  period VARCHAR(50),                          -- Human-readable range, e.g. '2010-2024'
  record_count INTEGER,                        -- Total rows in CBS dataset
  column_count INTEGER,                        -- Number of measure columns
  modified TIMESTAMPTZ,                        -- Last CBS modification date
  graph_types VARCHAR(100),                    -- 'Table,Bar,Line' etc.
  api_url TEXT,                                -- v3 OData API URL
  themes TEXT[] DEFAULT '{}',                  -- CBS theme names (e.g. {'Bevolking', 'Regionale kerncijfers'})
  catalog_synced_at TIMESTAMPTZ,               -- When we last synced this entry

  -- Local activation state
  is_activated BOOLEAN DEFAULT false,          -- Admin has enabled this for data sync
  data_source_key VARCHAR(50) REFERENCES data_sources(key) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cbs_catalog_themes ON cbs_catalog USING gin(themes);
CREATE INDEX IF NOT EXISTS idx_cbs_catalog_activated ON cbs_catalog(is_activated) WHERE is_activated = true;
CREATE INDEX IF NOT EXISTS idx_cbs_catalog_frequency ON cbs_catalog(frequency);
CREATE INDEX IF NOT EXISTS idx_cbs_catalog_modified ON cbs_catalog(modified DESC);

-- Data source subscriptions — per-organization access to data sources.
-- Global admins configure data_sources; org admins subscribe to them.

CREATE TABLE IF NOT EXISTS data_source_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  data_source_key VARCHAR(50) NOT NULL REFERENCES data_sources(key) ON DELETE CASCADE,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  subscribed_by UUID REFERENCES users(id),
  sync_enabled BOOLEAN DEFAULT true,
  custom_filters JSONB DEFAULT '{}',           -- Org-specific overrides (year range, region filter)
  UNIQUE(organization_id, data_source_key)
);

-- Link existing data_sources to cbs_catalog where possible
UPDATE data_sources SET cbs_table_id = cbs_table_id; -- no-op, just ensure column exists

-- Add catalog_synced_at to track when catalog was last refreshed
CREATE TABLE IF NOT EXISTS system_state (
  key VARCHAR(50) PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
