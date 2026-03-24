-- Migration 011: Add forecast metadata columns for TSA engine output
-- These columns are nullable — CBS actuals have NULL for all of them.
-- Only rows with source = 'ruimtemeesters_prognose' will populate these.

-- Widen value columns to NUMERIC for fractional forecast values
ALTER TABLE data_bevolking ALTER COLUMN value TYPE NUMERIC(12,2);
ALTER TABLE data_huishoudens ALTER COLUMN value TYPE NUMERIC(12,2);
ALTER TABLE data_woningen ALTER COLUMN value TYPE NUMERIC(12,2);
ALTER TABLE data_woningtekort ALTER COLUMN value TYPE NUMERIC(12,2);

ALTER TABLE data_bevolking
  ADD COLUMN IF NOT EXISTS confidence_lower NUMERIC,
  ADD COLUMN IF NOT EXISTS confidence_upper NUMERIC,
  ADD COLUMN IF NOT EXISTS model_profile VARCHAR(50),
  ADD COLUMN IF NOT EXISTS forecast_vintage TIMESTAMP;

ALTER TABLE data_huishoudens
  ADD COLUMN IF NOT EXISTS confidence_lower NUMERIC,
  ADD COLUMN IF NOT EXISTS confidence_upper NUMERIC,
  ADD COLUMN IF NOT EXISTS model_profile VARCHAR(50),
  ADD COLUMN IF NOT EXISTS forecast_vintage TIMESTAMP;

ALTER TABLE data_woningen
  ADD COLUMN IF NOT EXISTS confidence_lower NUMERIC,
  ADD COLUMN IF NOT EXISTS confidence_upper NUMERIC,
  ADD COLUMN IF NOT EXISTS model_profile VARCHAR(50),
  ADD COLUMN IF NOT EXISTS forecast_vintage TIMESTAMP;

ALTER TABLE data_woningtekort
  ADD COLUMN IF NOT EXISTS confidence_lower NUMERIC,
  ADD COLUMN IF NOT EXISTS confidence_upper NUMERIC,
  ADD COLUMN IF NOT EXISTS model_profile VARCHAR(50),
  ADD COLUMN IF NOT EXISTS forecast_vintage TIMESTAMP;

-- Index for querying latest forecast vintage
CREATE INDEX IF NOT EXISTS idx_bevolking_forecast_vintage
  ON data_bevolking (source, forecast_vintage) WHERE source != 'cbs_actuals';

CREATE INDEX IF NOT EXISTS idx_huishoudens_forecast_vintage
  ON data_huishoudens (source, forecast_vintage) WHERE source != 'cbs_actuals';

CREATE INDEX IF NOT EXISTS idx_woningen_forecast_vintage
  ON data_woningen (source, forecast_vintage) WHERE source != 'cbs_actuals';

CREATE INDEX IF NOT EXISTS idx_woningtekort_forecast_vintage
  ON data_woningtekort (source, forecast_vintage) WHERE source != 'cbs_actuals';
