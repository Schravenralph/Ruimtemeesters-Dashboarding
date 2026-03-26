-- Migration 012: Supercategories and data sources registry
-- Enables multi-domain dashboarding (wonen, duurzaamheid, etc.)

-- Supercategories: top-level domain grouping
CREATE TABLE supercategories (
  key VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(30),
  color VARCHAR(7),
  sort_order INT DEFAULT 0
);

-- Data sources registry: replaces hardcoded DATA_SOURCES constant
CREATE TABLE data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  supercategory VARCHAR(50) NOT NULL REFERENCES supercategories(key),
  table_name VARCHAR(100) NOT NULL,
  dimension_columns TEXT[] NOT NULL,
  value_column VARCHAR(50) DEFAULT 'value',
  unit VARCHAR(30) DEFAULT 'aantal',
  default_filters JSONB,
  export_columns TEXT[],
  cbs_table_id VARCHAR(20),
  sync_config JSONB,
  description TEXT,
  icon VARCHAR(30),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add supercategory and is_overview to themes
ALTER TABLE themes ADD COLUMN IF NOT EXISTS supercategory VARCHAR(50) REFERENCES supercategories(key);
ALTER TABLE themes ADD COLUMN IF NOT EXISTS is_overview BOOLEAN DEFAULT false;

-- Seed "Wonen" supercategory
INSERT INTO supercategories (key, name, description, icon, color, sort_order) VALUES
  ('wonen', 'Wonen', 'Bevolking, huishoudens en woningmarkt', 'Home', '#3b82f6', 0);

-- Seed existing data sources
INSERT INTO data_sources (key, name, supercategory, table_name, dimension_columns, value_column, unit, default_filters, cbs_table_id, sort_order) VALUES
  ('bevolking', 'Bevolking', 'wonen', 'data_bevolking', ARRAY['age_group', 'gender'], 'value', 'aantal', NULL, '03759ned', 0),
  ('huishoudens', 'Huishoudens', 'wonen', 'data_huishoudens', ARRAY['household_type'], 'value', 'aantal', '{"dimension_type": "samenstelling"}', '71486ned', 1),
  ('woningen', 'Woningen', 'wonen', 'data_woningen', ARRAY['tenure_type', 'dwelling_type'], 'value', 'aantal', NULL, '82550NED', 2),
  ('woningtekort', 'Woningtekort', 'wonen', 'data_woningtekort', ARRAY['metric'], 'value', 'percentage', NULL, NULL, 3);

-- Update existing themes with supercategory
UPDATE themes SET supercategory = 'wonen' WHERE supercategory IS NULL;
UPDATE themes SET is_overview = true WHERE slug = 'overzicht';
