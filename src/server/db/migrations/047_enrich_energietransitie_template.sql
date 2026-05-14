-- Issue #106 / EPIC theme template audit. Cycle 15. Energietransitie is
-- the focused "fossiel → hernieuwbaar" lens within the duurzaamheid
-- supercategory. Where `energie` shows the full breakdown and
-- `duurzaamheid-overzicht` shows the broader picture, this theme tracks
-- the *transition* indicators per gemeente.

UPDATE themes
SET kpi_config = jsonb_build_array(
  jsonb_build_object(
    'label', 'Aardgas (TJ)',
    'dataSource', 'energie',
    'dimension', 'fuel_type',
    'dimensionValue', 'aardgas',
    'format', 'compact',
    'deltaDirection', 'higher-is-bad'
  ),
  jsonb_build_object(
    'label', 'Elektriciteit (TJ)',
    'dataSource', 'energie',
    'dimension', 'fuel_type',
    'dimensionValue', 'elektriciteit',
    'format', 'compact',
    'deltaDirection', 'neutral'
  ),
  jsonb_build_object(
    'label', 'Stadsverwarming (TJ)',
    'dataSource', 'energie',
    'dimension', 'fuel_type',
    'dimensionValue', 'stadsverwarming',
    'format', 'compact',
    'deltaDirection', 'higher-is-good'
  ),
  jsonb_build_object(
    'label', 'Zonne-capaciteit (kW)',
    'dataSource', 'hernieuwbaar',
    'format', 'compact',
    'deltaDirection', 'higher-is-good'
  )
)
WHERE slug = 'energietransitie';

-- 7 tiles, tight transitie-narrative.
--   Row 1 (y=0..3):  aardgas-line (down=good)        | elektriciteit-line (up=transitie)
--   Row 2 (y=4..7):  stadsverwarming-line            | zonne-capaciteit-line
--   Row 3 (y=8..11): brandstofmix stacked-bar        | energie prognose tot 2030
--   Row 4 (y=12..15): aardgas choropleth (full-width)

UPDATE dashboard_templates
SET
  description = 'De energietransitie-monitor: aardgas dalen, elektriciteit + stadsverwarming + zon stijgen. Vergelijkt jouw gemeente met cohort/provincie/landelijk en projecteert tot 2030.',
  tiles = jsonb_build_array(
    jsonb_build_object(
      'id', 'b2c3d4e5-0001-400c-800c-000000000001',
      'order', 0,
      'title', 'Aardgasverbruik (transitie-indicator)',
      'description', 'Aardgas-TJ over de tijd in woningen. Dalende lijn = succesvolle isolatie + elektrificatie. Kerncijfer voor het uitfaseren van gas.',
      'chartType', 'line',
      'dataSource', 'energie',
      'dimensions', jsonb_build_array('fuel_type'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dimensionValue', 'aardgas')
    ),
    jsonb_build_object(
      'id', 'b2c3d4e5-0001-400c-800c-000000000002',
      'order', 1,
      'title', 'Elektriciteitsverbruik woningen',
      'description', 'Elektrisch verbruik per jaar (TJ). Stijging is verwacht naarmate woningen overstappen van gas — een neutrale (niet "slechte") indicator binnen de transitie.',
      'chartType', 'line',
      'dataSource', 'energie',
      'dimensions', jsonb_build_array('fuel_type'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dimensionValue', 'elektriciteit')
    ),
    jsonb_build_object(
      'id', 'b2c3d4e5-0001-400c-800c-000000000003',
      'order', 2,
      'title', 'Stadsverwarming woningen',
      'description', 'Verbruik via warmtenetten. Stijgende lijn duidt op succesvolle uitrol — een belangrijke route voor gas-vrij wonen op woningvoorraad waar warmtepompen niet praktisch zijn.',
      'chartType', 'line',
      'dataSource', 'energie',
      'dimensions', jsonb_build_array('fuel_type'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dimensionValue', 'stadsverwarming')
    ),
    jsonb_build_object(
      'id', 'b2c3d4e5-0001-400c-800c-000000000004',
      'order', 3,
      'title', 'Zonne-capaciteit (kW)',
      'description', 'Geinstalleerde zonne-capaciteit. Vandaag de enige hernieuwbare bron in data_hernieuwbaar — wind/biomassa volgen zodra de sync werkt.',
      'chartType', 'line',
      'dataSource', 'hernieuwbaar',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'b2c3d4e5-0001-400c-800c-000000000005',
      'order', 4,
      'title', 'Brandstofmix per jaar',
      'description', 'Stapelt aardgas, elektriciteit, stadsverwarming en overige fuels per jaar — zie het aandeel van fossiel afnemen / hernieuwbaar opkomen.',
      'chartType', 'stacked-bar',
      'dataSource', 'energie',
      'dimensions', jsonb_build_array('fuel_type'),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'b2c3d4e5-0001-400c-800c-000000000006',
      'order', 5,
      'title', 'Energieprognose tot 2030',
      'description', 'TSA Engine forecast totaal energieverbruik — geeft het verwachte pad richting 2030.',
      'chartType', 'line',
      'dataSource', 'energie',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dataOrigin', 'ruimtemeesters_prognose')
    ),
    jsonb_build_object(
      'id', 'b2c3d4e5-0001-400c-800c-000000000007',
      'order', 6,
      'title', 'Aardgasverbruik per gemeente',
      'description', 'Kaartweergave aardgas — koplopers in transitie zijn de gemeenten met de laagste waarden.',
      'chartType', 'choropleth',
      'dataSource', 'energie',
      'dimensions', jsonb_build_array('fuel_type'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dimensionValue', 'aardgas')
    )
  ),
  layout = jsonb_build_array(
    jsonb_build_object('i', 'b2c3d4e5-0001-400c-800c-000000000001', 'x', 0, 'y',  0, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'b2c3d4e5-0001-400c-800c-000000000002', 'x', 6, 'y',  0, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'b2c3d4e5-0001-400c-800c-000000000003', 'x', 0, 'y',  4, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'b2c3d4e5-0001-400c-800c-000000000004', 'x', 6, 'y',  4, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'b2c3d4e5-0001-400c-800c-000000000005', 'x', 0, 'y',  8, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'b2c3d4e5-0001-400c-800c-000000000006', 'x', 6, 'y',  8, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'b2c3d4e5-0001-400c-800c-000000000007', 'x', 0, 'y', 12, 'w', 12,'h', 4)
  ),
  updated_at = NOW(),
  version = version + 1
WHERE theme_slug = 'energietransitie';
