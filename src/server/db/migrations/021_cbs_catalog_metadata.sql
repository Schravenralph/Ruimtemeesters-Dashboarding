-- CBS Catalog Inspection Metadata
-- Adds structured per-table metadata so catalogue browse, activation dialog,
-- and global subsetted sync rules can operate on real dimension/measure/geo
-- shapes instead of flying blind.
--
-- Populated by src/server/services/cbs/cbs-catalog-metadata.ts. The metadata
-- column is a JSONB blob shaped like:
--   {
--     "dimensions": [{name, title, kind, valueCount, hasTotal, totalId?, geoLevels?, min?, max?}],
--     "dimensionValues": { dimName: [{id, title, group}, ...] },
--     "measures":  [{id, title, unit, group, decimals}],
--     "geoLevels":    ["land","provincie","gemeente", ...],
--     "periodRange": {min: 2000, max: 2024},
--     "recommendedDefaults": {measure, regionDim, totalDimValues: {dimName: id}}
--   }

ALTER TABLE cbs_catalog
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS inspected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS inspection_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS inspection_error TEXT;

COMMENT ON COLUMN cbs_catalog.metadata IS
  'Structured dimensions/measures/geo profile inspected from CBS v4 OData; see migration 021 header for shape.';
COMMENT ON COLUMN cbs_catalog.inspection_status IS
  'NULL = never inspected; ok | error | partial';

-- Progress monitoring: find tables that still need inspecting.
CREATE INDEX IF NOT EXISTS idx_cbs_catalog_inspection_status
  ON cbs_catalog(inspection_status);

-- "Does this table have gemeente data?" and similar geo filters.
CREATE INDEX IF NOT EXISTS idx_cbs_catalog_geo_levels
  ON cbs_catalog USING gin ((metadata->'geoLevels'));
