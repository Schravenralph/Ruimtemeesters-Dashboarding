-- Add dimension_type to distinguish household composition vs age-of-reference-person
-- Values: 'samenstelling' (existing data), 'leeftijd_referentiepersoon' (new)
ALTER TABLE data_huishoudens ADD COLUMN IF NOT EXISTS dimension_type VARCHAR(50) DEFAULT 'samenstelling';

-- Update unique constraint to include dimension_type and source
ALTER TABLE data_huishoudens DROP CONSTRAINT IF EXISTS data_huishoudens_geo_code_year_household_type_key;
ALTER TABLE data_huishoudens ADD CONSTRAINT data_huishoudens_unique
  UNIQUE(geo_code, year, household_type, dimension_type, source);
