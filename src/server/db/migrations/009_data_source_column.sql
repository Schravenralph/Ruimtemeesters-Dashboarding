-- Add source column to distinguish actuals from projections
-- Values: 'cbs_actuals', 'cbs_prognose', 'ruimtemeesters_prognose' (future)
ALTER TABLE data_bevolking ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'cbs_actuals';
ALTER TABLE data_huishoudens ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'cbs_actuals';
ALTER TABLE data_woningen ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'cbs_actuals';
ALTER TABLE data_woningtekort ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'cbs_actuals';

-- Drop old unique constraints and recreate with source column.
-- This allows the same (geo_code, year, age_group, gender) to exist
-- for both 'cbs_actuals' and 'cbs_prognose'.
-- Note: data_huishoudens constraint is updated in migration 010.
ALTER TABLE data_bevolking DROP CONSTRAINT IF EXISTS data_bevolking_geo_code_year_age_group_gender_key;
ALTER TABLE data_bevolking ADD CONSTRAINT data_bevolking_unique
  UNIQUE(geo_code, year, age_group, gender, source);

ALTER TABLE data_woningen DROP CONSTRAINT IF EXISTS data_woningen_geo_code_year_tenure_type_dwelling_type_key;
ALTER TABLE data_woningen ADD CONSTRAINT data_woningen_unique
  UNIQUE(geo_code, year, tenure_type, dwelling_type, source);

ALTER TABLE data_woningtekort DROP CONSTRAINT IF EXISTS data_woningtekort_geo_code_year_metric_key;
ALTER TABLE data_woningtekort ADD CONSTRAINT data_woningtekort_unique
  UNIQUE(geo_code, year, metric, source);

-- Indexes for source filtering
CREATE INDEX IF NOT EXISTS idx_bevolking_source ON data_bevolking(source);
CREATE INDEX IF NOT EXISTS idx_huishoudens_source ON data_huishoudens(source);
CREATE INDEX IF NOT EXISTS idx_woningen_source ON data_woningen(source);
CREATE INDEX IF NOT EXISTS idx_woningtekort_source ON data_woningtekort(source);
