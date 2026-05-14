-- Issue #106 / EPIC theme template audit. Fifth template-enrichment cycle.
-- First duurzaamheid-supercategory template at quality.
--
-- Depends on migration 039 (energie.default_filters = {sector: 'woningen'})
-- and the controller fix in this PR that lets default-filtered dims
-- bypass the force-totaal logic. Without those two, dimension-based
-- queries on energie return zero rows because sector has no 'totaal'.
--
-- Source: data_energie (38k rows, 465 geos, 2010-2030, cbs_actuals +
-- ruimtemeesters_prognose). Default sector = 'woningen' so every tile
-- shows woningverbruik unless a future tile config overrides via
-- `?sector=verwarming`.

UPDATE themes
SET kpi_config = jsonb_build_array(
  jsonb_build_object(
    'label', 'Energie totaal (TJ)',
    'dataSource', 'energie',
    'format', 'compact',
    'deltaDirection', 'neutral'
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
  )
)
WHERE slug = 'energie';

-- 7 tiles. Per-fuel line tiles use tile.config.dimensionValue (plumb
-- shipped in #133).
--
--   Row 1 (y=0..3):   [ totaal-line     | brandstofmix-stacked-bar ]
--   Row 2 (y=4..7):   [ aardgas-line    | elektriciteit-line       ]
--   Row 3 (y=8..11):  [ stadsverwarming-line | prognose-line+envelope ]
--   Row 4 (y=12..15): [ choropleth aardgasverbruik (full-width)       ]

UPDATE dashboard_templates
SET
  description = 'Woninggebonden energieverbruik per brandstof — aardgas, elektriciteit, stadsverwarming — met prognose tot 2030. Standaard scope is sector=woningen (override via ?sector=verwarming).',
  tiles = jsonb_build_array(
    jsonb_build_object(
      'id', 'e5f6a7b8-0001-4005-8005-000000000001',
      'order', 0,
      'title', 'Energieverbruik totaal (woningen)',
      'description', 'Totaal energieverbruik in woningen over de tijd, in TJ — vergelijk met cohort, provincie en landelijk gemiddelde.',
      'chartType', 'line',
      'dataSource', 'energie',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'e5f6a7b8-0001-4005-8005-000000000002',
      'order', 1,
      'title', 'Brandstofmix per jaar',
      'description', 'Aandeel van iedere brandstof in het totale woningverbruik — laat zien hoe de elektrificatie zich voltrekt.',
      'chartType', 'stacked-bar',
      'dataSource', 'energie',
      'dimensions', jsonb_build_array('fuel_type'),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'e5f6a7b8-0001-4005-8005-000000000003',
      'order', 2,
      'title', 'Aardgasverbruik trend',
      'description', 'Aardgas per jaar (TJ). Een dalende trend duidt op succesvolle elektrificatie / isolatie.',
      'chartType', 'line',
      'dataSource', 'energie',
      'dimensions', jsonb_build_array('fuel_type'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dimensionValue', 'aardgas')
    ),
    jsonb_build_object(
      'id', 'e5f6a7b8-0001-4005-8005-000000000004',
      'order', 3,
      'title', 'Elektriciteitsverbruik trend',
      'description', 'Elektrisch verbruik per jaar (TJ). Stijging is verwacht naarmate woningen overstappen van gas.',
      'chartType', 'line',
      'dataSource', 'energie',
      'dimensions', jsonb_build_array('fuel_type'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dimensionValue', 'elektriciteit')
    ),
    jsonb_build_object(
      'id', 'e5f6a7b8-0001-4005-8005-000000000005',
      'order', 4,
      'title', 'Stadsverwarming trend',
      'description', 'Verbruik van stadsverwarming (TJ) — proxy voor warmtenet-uitrol.',
      'chartType', 'line',
      'dataSource', 'energie',
      'dimensions', jsonb_build_array('fuel_type'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dimensionValue', 'stadsverwarming')
    ),
    jsonb_build_object(
      'id', 'e5f6a7b8-0001-4005-8005-000000000006',
      'order', 5,
      'title', 'Energieprognose tot 2030',
      'description', 'TSA Engine prognose woninggebonden energieverbruik — ruimtemeesters_prognose. Geen confidence bounds nog (alleen bevolking heeft die vandaag).',
      'chartType', 'line',
      'dataSource', 'energie',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dataOrigin', 'ruimtemeesters_prognose')
    ),
    jsonb_build_object(
      'id', 'e5f6a7b8-0001-4005-8005-000000000007',
      'order', 6,
      'title', 'Aardgasverbruik per gemeente',
      'description', 'Kaartweergave van aardgasverbruik per gemeente in het geselecteerde jaar.',
      'chartType', 'choropleth',
      'dataSource', 'energie',
      'dimensions', jsonb_build_array('fuel_type'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dimensionValue', 'aardgas')
    )
  ),
  layout = jsonb_build_array(
    jsonb_build_object('i', 'e5f6a7b8-0001-4005-8005-000000000001', 'x', 0, 'y',  0, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'e5f6a7b8-0001-4005-8005-000000000002', 'x', 6, 'y',  0, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'e5f6a7b8-0001-4005-8005-000000000003', 'x', 0, 'y',  4, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'e5f6a7b8-0001-4005-8005-000000000004', 'x', 6, 'y',  4, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'e5f6a7b8-0001-4005-8005-000000000005', 'x', 0, 'y',  8, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'e5f6a7b8-0001-4005-8005-000000000006', 'x', 6, 'y',  8, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'e5f6a7b8-0001-4005-8005-000000000007', 'x', 0, 'y', 12, 'w', 12,'h', 4)
  ),
  updated_at = NOW(),
  version = version + 1
WHERE theme_slug = 'energie';
