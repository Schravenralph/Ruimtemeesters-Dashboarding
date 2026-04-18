-- The existing emissies data source pointed at CBS table 84978NED, which is
-- actually migration data (Immigratie/Emigratie), not emissions. Its measure
-- code "CO2_1" doesn't exist on that table, so every sync returned 0 rows.
--
-- Real emissions live in 85668NED ("Emissies naar lucht op Nederlands
-- grondgebied; totalen"). That table has no region dimension (NL total only),
-- so we use regionDimension='NONE' — the generic sync engine now recognises
-- that and assigns geo_code='NL', level='land' to every row.
--
-- Dimensions on 85668NED:
--   Emissiebronnen (T001176 = Totaal Stationaire en mobiele bronnen)
--   EmissiesNaarLucht (A044109 = CO2, A044107 = CH4, A044110 = N2O, ...)
--   Perioden

UPDATE data_sources
SET
  cbs_table_id = '85668NED',
  sync_config = jsonb_build_object(
    'cbsTable', '85668NED',
    'targetTable', 'data_emissies',
    'filter', '',
    'measureCode', 'T001372',
    'regionDimension', 'NONE',
    'allowedLevels', jsonb_build_array('land'),
    'dimensionMappings', jsonb_build_array(
      jsonb_build_object(
        'cbsDimension', 'Emissiebronnen',
        'targetColumn', 'sector',
        'valueMap', jsonb_build_object('T001176', 'totaal')
      ),
      jsonb_build_object(
        'cbsDimension', 'EmissiesNaarLucht',
        'targetColumn', 'emission_type',
        'valueMap', jsonb_build_object(
          'A044109', 'co2',
          'A044107', 'ch4',
          'A044110', 'n2o',
          'A044111', 'nh3',
          'A044112', 'nox',
          'A044114', 'so2',
          'A044118', 'nmvos',
          'A044113', 'pm10'
        )
      )
    )
  )
WHERE key = 'emissies';
