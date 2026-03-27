-- Migration 013: Sustainability data tables + supercategory + themes

CREATE TABLE data_energie (
  id SERIAL PRIMARY KEY,
  geo_code VARCHAR(10) NOT NULL,
  year INT NOT NULL,
  sector VARCHAR(50) NOT NULL,
  fuel_type VARCHAR(50) NOT NULL,
  value NUMERIC(12,2),
  source VARCHAR(50) DEFAULT 'cbs_actuals',
  confidence_lower NUMERIC,
  confidence_upper NUMERIC,
  model_profile VARCHAR(50),
  forecast_vintage TIMESTAMP,
  UNIQUE(geo_code, year, sector, fuel_type, source)
);
CREATE INDEX idx_energie_geo_year ON data_energie (geo_code, year);

CREATE TABLE data_emissies (
  id SERIAL PRIMARY KEY,
  geo_code VARCHAR(10) NOT NULL,
  year INT NOT NULL,
  sector VARCHAR(50) NOT NULL,
  emission_type VARCHAR(50) NOT NULL,
  value NUMERIC(12,2),
  source VARCHAR(50) DEFAULT 'cbs_actuals',
  confidence_lower NUMERIC,
  confidence_upper NUMERIC,
  model_profile VARCHAR(50),
  forecast_vintage TIMESTAMP,
  UNIQUE(geo_code, year, sector, emission_type, source)
);
CREATE INDEX idx_emissies_geo_year ON data_emissies (geo_code, year);

CREATE TABLE data_hernieuwbaar (
  id SERIAL PRIMARY KEY,
  geo_code VARCHAR(10) NOT NULL,
  year INT NOT NULL,
  energy_source VARCHAR(50) NOT NULL,
  metric VARCHAR(50) NOT NULL,
  value NUMERIC(12,2),
  source VARCHAR(50) DEFAULT 'cbs_actuals',
  confidence_lower NUMERIC,
  confidence_upper NUMERIC,
  model_profile VARCHAR(50),
  forecast_vintage TIMESTAMP,
  UNIQUE(geo_code, year, energy_source, metric, source)
);
CREATE INDEX idx_hernieuwbaar_geo_year ON data_hernieuwbaar (geo_code, year);

CREATE TABLE data_afval (
  id SERIAL PRIMARY KEY,
  geo_code VARCHAR(10) NOT NULL,
  year INT NOT NULL,
  waste_type VARCHAR(50) NOT NULL,
  metric VARCHAR(50) NOT NULL,
  value NUMERIC(12,2),
  source VARCHAR(50) DEFAULT 'cbs_actuals',
  confidence_lower NUMERIC,
  confidence_upper NUMERIC,
  model_profile VARCHAR(50),
  forecast_vintage TIMESTAMP,
  UNIQUE(geo_code, year, waste_type, metric, source)
);
CREATE INDEX idx_afval_geo_year ON data_afval (geo_code, year);

-- Duurzaamheid supercategory
INSERT INTO supercategories (key, name, description, icon, color, sort_order) VALUES
  ('duurzaamheid', 'Duurzaamheid', 'Energie, emissies, hernieuwbaar en afval', 'Leaf', '#10b981', 1);

-- Data source registry entries
INSERT INTO data_sources (key, name, supercategory, table_name, dimension_columns, value_column, unit, cbs_table_id, sync_config, sort_order) VALUES
  ('energie', 'Energie', 'duurzaamheid', 'data_energie', ARRAY['sector', 'fuel_type'], 'value', 'TJ', '83867NED', NULL, 0),
  ('emissies', 'Emissies', 'duurzaamheid', 'data_emissies', ARRAY['sector', 'emission_type'], 'value', 'ton CO2-eq', NULL, NULL, 1),
  ('hernieuwbaar', 'Hernieuwbare Energie', 'duurzaamheid', 'data_hernieuwbaar', ARRAY['energy_source', 'metric'], 'value', 'kW', '84518NED', NULL, 2),
  ('afval', 'Afval & Circulair', 'duurzaamheid', 'data_afval', ARRAY['waste_type', 'metric'], 'value', 'kg', '83452NED', NULL, 3);

-- Sustainability themes
INSERT INTO themes (id, slug, name, description, icon, "order", is_system, supercategory, is_overview) VALUES
  ('30000000-0000-0000-0000-000000000001', 'duurzaamheid-overzicht', 'Overzicht Duurzaamheid', 'Totaaloverzicht duurzaamheidsindicatoren', 'Leaf', 0, true, 'duurzaamheid', true),
  ('30000000-0000-0000-0000-000000000002', 'energie', 'Energie', 'Energieverbruik per sector en brandstoftype', 'Zap', 1, true, 'duurzaamheid', false),
  ('30000000-0000-0000-0000-000000000003', 'emissies', 'Emissies', 'Broeikasgasemissies per sector', 'Cloud', 2, true, 'duurzaamheid', false),
  ('30000000-0000-0000-0000-000000000004', 'hernieuwbare-energie', 'Hernieuwbare Energie', 'Zonnepanelen, windenergie en biomassa', 'Sun', 3, true, 'duurzaamheid', false),
  ('30000000-0000-0000-0000-000000000005', 'afval-circulair', 'Afval & Circulair', 'Gemeentelijk afval en scheidingspercentages', 'Recycle', 4, true, 'duurzaamheid', false);

-- Tiles for sustainability themes
INSERT INTO tiles (theme_id, title, chart_type, data_source, dimensions, "order") VALUES
  ('30000000-0000-0000-0000-000000000002', 'Energieverbruik per sector', 'bar', 'energie', ARRAY['sector'], 0),
  ('30000000-0000-0000-0000-000000000002', 'Energieverbruik per brandstof', 'pie', 'energie', ARRAY['fuel_type'], 1),
  ('30000000-0000-0000-0000-000000000002', 'Energieverbruik trend', 'line', 'energie', ARRAY['sector'], 2),
  ('30000000-0000-0000-0000-000000000004', 'Zonnestroom capaciteit', 'line', 'hernieuwbaar', ARRAY['energy_source'], 0),
  ('30000000-0000-0000-0000-000000000004', 'Hernieuwbare energie per bron', 'bar', 'hernieuwbaar', ARRAY['energy_source'], 1),
  ('30000000-0000-0000-0000-000000000005', 'Afval per type', 'pie', 'afval', ARRAY['waste_type'], 0),
  ('30000000-0000-0000-0000-000000000005', 'Scheidingspercentage trend', 'line', 'afval', ARRAY['waste_type'], 1);
