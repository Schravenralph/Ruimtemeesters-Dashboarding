-- Issue #106 / EPIC theme template audit. Cycle 14. The duurzaamheid
-- supercategory's demo template — parallel to `overzicht` for the
-- wonen supercategory. Spans three sources: energie, hernieuwbaar,
-- afval (emissies skipped per audit data-quality block: only NL geo,
-- sector totaal).

UPDATE themes
SET kpi_config = jsonb_build_array(
  jsonb_build_object(
    'label', 'Energieverbruik (TJ)',
    'dataSource', 'energie',
    'format', 'compact',
    'deltaDirection', 'higher-is-bad'
  ),
  jsonb_build_object(
    'label', 'Aardgas (TJ)',
    'dataSource', 'energie',
    'dimension', 'fuel_type',
    'dimensionValue', 'aardgas',
    'format', 'compact',
    'deltaDirection', 'higher-is-bad'
  ),
  jsonb_build_object(
    'label', 'Zonne-capaciteit (kW)',
    'dataSource', 'hernieuwbaar',
    'format', 'compact',
    'deltaDirection', 'higher-is-good'
  ),
  jsonb_build_object(
    'label', 'Afval per inwoner',
    'dataSource', 'afval',
    'format', 'compact',
    'deltaDirection', 'higher-is-bad'
  ),
  jsonb_build_object(
    'label', 'Restafval per inwoner',
    'dataSource', 'afval',
    'dimension', 'waste_type',
    'dimensionValue', 'restafval',
    'format', 'compact',
    'deltaDirection', 'higher-is-bad'
  )
)
WHERE slug = 'duurzaamheid-overzicht';

-- 7 tiles cross-source.
--   Row 1 (y=0..3):  energie-line   | hernieuwbaar-line
--   Row 2 (y=4..7):  afval-line     | aardgas-line (transitie-indicator)
--   Row 3 (y=8..11): energie prognose | afval prognose
--   Row 4 (y=12..15): restafval choropleth (full-width)

UPDATE dashboard_templates
SET
  description = 'Het complete duurzaamheidsplaatje per gemeente: energieverbruik, hernieuwbare capaciteit en afvalproductie — met TSA-prognose tot 2030.',
  tiles = jsonb_build_array(
    jsonb_build_object(
      'id', 'e1b2c3d4-0001-400b-800b-000000000001',
      'order', 0,
      'title', 'Energieverbruik woningen',
      'description', 'Totaal energieverbruik in woningen (TJ). Standaard met cohort/provincie/landelijke referentie.',
      'chartType', 'line',
      'dataSource', 'energie',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'e1b2c3d4-0001-400b-800b-000000000002',
      'order', 1,
      'title', 'Hernieuwbare capaciteit',
      'description', 'Geinstalleerde capaciteit (kW). Vandaag enkel zonnepanelen — wind/biomassa volgen zodra de sync werkt.',
      'chartType', 'line',
      'dataSource', 'hernieuwbaar',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'e1b2c3d4-0001-400b-800b-000000000003',
      'order', 2,
      'title', 'Afvalproductie per inwoner',
      'description', 'Totaal afval per inwoner (kg). Daalt typisch bij succesvol circulair beleid.',
      'chartType', 'line',
      'dataSource', 'afval',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'e1b2c3d4-0001-400b-800b-000000000004',
      'order', 3,
      'title', 'Aardgasverbruik woningen (transitie-indicator)',
      'description', 'Aardgas-TJ in woningen — dalende lijn = succesvolle elektrificatie + isolatie. Sleutelfiguur voor de energietransitie.',
      'chartType', 'line',
      'dataSource', 'energie',
      'dimensions', jsonb_build_array('fuel_type'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dimensionValue', 'aardgas')
    ),
    jsonb_build_object(
      'id', 'e1b2c3d4-0001-400b-800b-000000000005',
      'order', 4,
      'title', 'Energieprognose tot 2030',
      'description', 'TSA Engine prognose energieverbruik in woningen.',
      'chartType', 'line',
      'dataSource', 'energie',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dataOrigin', 'ruimtemeesters_prognose')
    ),
    jsonb_build_object(
      'id', 'e1b2c3d4-0001-400b-800b-000000000006',
      'order', 5,
      'title', 'Afvalprognose tot 2030',
      'description', 'TSA Engine prognose afval per inwoner — proxy voor circulariteit-trend.',
      'chartType', 'line',
      'dataSource', 'afval',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dataOrigin', 'ruimtemeesters_prognose')
    ),
    jsonb_build_object(
      'id', 'e1b2c3d4-0001-400b-800b-000000000007',
      'order', 6,
      'title', 'Restafval per gemeente',
      'description', 'Kaartweergave restafval — koplopers zijn gemeenten met lage waarden (succesvolle scheiding aan de bron).',
      'chartType', 'choropleth',
      'dataSource', 'afval',
      'dimensions', jsonb_build_array('waste_type'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dimensionValue', 'restafval')
    )
  ),
  layout = jsonb_build_array(
    jsonb_build_object('i', 'e1b2c3d4-0001-400b-800b-000000000001', 'x', 0, 'y',  0, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'e1b2c3d4-0001-400b-800b-000000000002', 'x', 6, 'y',  0, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'e1b2c3d4-0001-400b-800b-000000000003', 'x', 0, 'y',  4, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'e1b2c3d4-0001-400b-800b-000000000004', 'x', 6, 'y',  4, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'e1b2c3d4-0001-400b-800b-000000000005', 'x', 0, 'y',  8, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'e1b2c3d4-0001-400b-800b-000000000006', 'x', 6, 'y',  8, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'e1b2c3d4-0001-400b-800b-000000000007', 'x', 0, 'y', 12, 'w', 12,'h', 4)
  ),
  updated_at = NOW(),
  version = version + 1
WHERE theme_slug = 'duurzaamheid-overzicht';
