-- Issue #106 / EPIC theme template audit. Fourth template enrichment
-- in the 2026-05-14 series (after woningen #131, bevolking #132,
-- woningtekort #133). Single source: data_huishoudens (97k rows, 606
-- geos, 2000-2025). dimension_type=samenstelling is auto-applied via
-- the registry's defaultFilters; the household_type dim values used
-- here are eenpersoons / paar_met_kinderen / eenouder / totaal.

UPDATE themes
SET kpi_config = jsonb_build_array(
  jsonb_build_object(
    'label', 'Huishoudens',
    'dataSource', 'huishoudens',
    'format', 'compact',
    'deltaDirection', 'neutral'
  ),
  jsonb_build_object(
    'label', 'Eenpersoonshuishoudens',
    'dataSource', 'huishoudens',
    'dimension', 'household_type',
    'dimensionValue', 'eenpersoons',
    'format', 'compact',
    'deltaDirection', 'neutral'
  ),
  jsonb_build_object(
    'label', 'Gezinnen met kinderen',
    'dataSource', 'huishoudens',
    'dimension', 'household_type',
    'dimensionValue', 'paar_met_kinderen',
    'format', 'compact',
    'deltaDirection', 'neutral'
  ),
  jsonb_build_object(
    'label', 'Eenoudergezinnen',
    'dataSource', 'huishoudens',
    'dimension', 'household_type',
    'dimensionValue', 'eenouder',
    'format', 'compact',
    'deltaDirection', 'neutral'
  )
)
WHERE slug = 'huishoudens';

-- 7 tiles. Two single-value line tiles use the tile.config.dimensionValue
-- plumb added in #133.

UPDATE dashboard_templates
SET
  description = 'Huishoudensontwikkeling en samenstelling — drijver van woningvraag. Onderscheidt eenpersoonshuishoudens, gezinnen met kinderen en eenoudergezinnen, met cohort/provincie/landelijke referenties.',
  tiles = jsonb_build_array(
    jsonb_build_object(
      'id', 'd4e5f6a7-0001-4004-8004-000000000001',
      'order', 0,
      'title', 'Huishoudens totaal',
      'description', 'Totale ontwikkeling van het aantal huishoudens — vergelijk met cohort, provincie en landelijk gemiddelde.',
      'chartType', 'line',
      'dataSource', 'huishoudens',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'd4e5f6a7-0001-4004-8004-000000000002',
      'order', 1,
      'title', 'Eenpersoonshuishoudens trend',
      'description', 'Sterke groeier in vrijwel iedere gemeente — drijft de vraag naar kleinere woningen.',
      'chartType', 'line',
      'dataSource', 'huishoudens',
      'dimensions', jsonb_build_array('household_type'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dimensionValue', 'eenpersoons')
    ),
    jsonb_build_object(
      'id', 'd4e5f6a7-0001-4004-8004-000000000003',
      'order', 2,
      'title', 'Huishoudens-samenstelling',
      'description', 'Verdeling tussen eenpersoons, paar met kinderen en eenouder — voor het geselecteerde jaar.',
      'chartType', 'pie',
      'dataSource', 'huishoudens',
      'dimensions', jsonb_build_array('household_type'),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'd4e5f6a7-0001-4004-8004-000000000004',
      'order', 3,
      'title', 'Gezinnen met kinderen trend',
      'description', 'Aantal paren met thuiswonende kinderen over tijd — bepaalt vraag naar gezinswoningen en voorzieningen voor de jeugd.',
      'chartType', 'line',
      'dataSource', 'huishoudens',
      'dimensions', jsonb_build_array('household_type'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dimensionValue', 'paar_met_kinderen')
    ),
    jsonb_build_object(
      'id', 'd4e5f6a7-0001-4004-8004-000000000005',
      'order', 4,
      'title', 'Samenstelling per gemeente',
      'description', 'Stapelt eenpersoons / paar met kinderen / eenouder per gemeente — laat regionale verschillen in huishoudensstructuur zien.',
      'chartType', 'stacked-bar',
      'dataSource', 'huishoudens',
      'dimensions', jsonb_build_array('household_type'),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'd4e5f6a7-0001-4004-8004-000000000006',
      'order', 5,
      'title', 'Huishoudens per gemeente',
      'description', 'Kaartweergave totaal-aantal huishoudens — klik op een gemeente om in te zoomen.',
      'chartType', 'choropleth',
      'dataSource', 'huishoudens',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'd4e5f6a7-0001-4004-8004-000000000007',
      'order', 6,
      'title', 'Overzicht naar samenstelling',
      'description', 'Tabel met absolute aantallen per samenstellingsklasse — handig voor exact aflezen of CSV-export.',
      'chartType', 'table',
      'dataSource', 'huishoudens',
      'dimensions', jsonb_build_array('household_type'),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    )
  ),
  layout = jsonb_build_array(
    jsonb_build_object('i', 'd4e5f6a7-0001-4004-8004-000000000001', 'x', 0, 'y',  0, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'd4e5f6a7-0001-4004-8004-000000000002', 'x', 6, 'y',  0, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'd4e5f6a7-0001-4004-8004-000000000003', 'x', 0, 'y',  4, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'd4e5f6a7-0001-4004-8004-000000000004', 'x', 6, 'y',  4, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'd4e5f6a7-0001-4004-8004-000000000005', 'x', 0, 'y',  8, 'w', 12,'h', 4),
    jsonb_build_object('i', 'd4e5f6a7-0001-4004-8004-000000000006', 'x', 0, 'y', 12, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'd4e5f6a7-0001-4004-8004-000000000007', 'x', 6, 'y', 12, 'w', 6, 'h', 4)
  ),
  updated_at = NOW(),
  version = version + 1
WHERE theme_slug = 'huishoudens';
