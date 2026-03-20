-- Users and auth
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'viewer',
  organization_id UUID,
  attributes JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  attributes JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE users ADD CONSTRAINT fk_users_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;

-- ABAC Policies
CREATE TABLE IF NOT EXISTS access_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  effect VARCHAR(10) NOT NULL CHECK (effect IN ('allow', 'deny')),
  resource VARCHAR(255) NOT NULL,
  conditions JSONB NOT NULL DEFAULT '[]',
  priority INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Geographic areas
CREATE TABLE IF NOT EXISTS geo_areas (
  code VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  level VARCHAR(50) NOT NULL,
  parent_code VARCHAR(50),
  geometry JSONB,
  CONSTRAINT fk_geo_parent FOREIGN KEY (parent_code) REFERENCES geo_areas(code) ON DELETE SET NULL
);

CREATE INDEX idx_geo_areas_level ON geo_areas(level);
CREATE INDEX idx_geo_areas_parent ON geo_areas(parent_code);

-- Dashboard themes (system-defined)
CREATE TABLE IF NOT EXISTS themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  config JSONB NOT NULL DEFAULT '{}',
  "order" INT NOT NULL DEFAULT 0,
  is_system BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tile definitions
CREATE TABLE IF NOT EXISTS tiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  chart_type VARCHAR(50) NOT NULL,
  data_source VARCHAR(255) NOT NULL,
  dimensions TEXT[] NOT NULL DEFAULT '{}',
  default_geo_level VARCHAR(50) NOT NULL DEFAULT 'gemeente',
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  "order" INT NOT NULL DEFAULT 0
);

-- Dashboard layouts
CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(theme_id, user_id)
);

-- Custom dashboards (user-created)
CREATE TABLE IF NOT EXISTS custom_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  tiles JSONB NOT NULL DEFAULT '[]',
  layout JSONB NOT NULL DEFAULT '[]',
  share_token VARCHAR(255) UNIQUE,
  share_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_custom_dashboards_user ON custom_dashboards(user_id);
CREATE INDEX idx_custom_dashboards_share ON custom_dashboards(share_token) WHERE share_token IS NOT NULL;

-- Data tables for demographic/housing data
CREATE TABLE IF NOT EXISTS data_bevolking (
  id SERIAL PRIMARY KEY,
  geo_code VARCHAR(50) NOT NULL REFERENCES geo_areas(code),
  year INT NOT NULL,
  age_group VARCHAR(50),
  gender VARCHAR(20),
  value INT NOT NULL,
  UNIQUE(geo_code, year, age_group, gender)
);

CREATE TABLE IF NOT EXISTS data_huishoudens (
  id SERIAL PRIMARY KEY,
  geo_code VARCHAR(50) NOT NULL REFERENCES geo_areas(code),
  year INT NOT NULL,
  household_type VARCHAR(100),
  value INT NOT NULL,
  UNIQUE(geo_code, year, household_type)
);

CREATE TABLE IF NOT EXISTS data_woningen (
  id SERIAL PRIMARY KEY,
  geo_code VARCHAR(50) NOT NULL REFERENCES geo_areas(code),
  year INT NOT NULL,
  tenure_type VARCHAR(100), -- eigendom, huur
  dwelling_type VARCHAR(100), -- eengezins, meergezins
  value INT NOT NULL,
  UNIQUE(geo_code, year, tenure_type, dwelling_type)
);

CREATE TABLE IF NOT EXISTS data_woningtekort (
  id SERIAL PRIMARY KEY,
  geo_code VARCHAR(50) NOT NULL REFERENCES geo_areas(code),
  year INT NOT NULL,
  metric VARCHAR(100) NOT NULL, -- tekort, overschot, vraag, aanbod
  value NUMERIC(12, 2) NOT NULL,
  UNIQUE(geo_code, year, metric)
);

CREATE INDEX idx_data_bevolking_geo_year ON data_bevolking(geo_code, year);
CREATE INDEX idx_data_huishoudens_geo_year ON data_huishoudens(geo_code, year);
CREATE INDEX idx_data_woningen_geo_year ON data_woningen(geo_code, year);
CREATE INDEX idx_data_woningtekort_geo_year ON data_woningtekort(geo_code, year);
