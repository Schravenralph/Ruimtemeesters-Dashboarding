-- Issue #106 / EPIC theme template audit. Cycle 12. Enrich the
-- `circulair` theme template (Circulaire Economie). Uses data_afval
-- which has 8 waste_type values, 124k rows, 615 geos, 1998-2030, and
-- ruimtemeesters_prognose data.
--
-- The sibling theme `afval-circulair` keeps its short scheidings-
-- focused framing; this one is the full circulair-economie view with
-- forecast.

UPDATE themes
SET kpi_config = jsonb_build_array(
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
  ),
  jsonb_build_object(
    'label', 'GFT per inwoner',
    'dataSource', 'afval',
    'dimension', 'waste_type',
    'dimensionValue', 'gft',
    'format', 'compact',
    'deltaDirection', 'higher-is-good'
  ),
  jsonb_build_object(
    'label', 'Papier per inwoner',
    'dataSource', 'afval',
    'dimension', 'waste_type',
    'dimensionValue', 'papier',
    'format', 'compact',
    'deltaDirection', 'higher-is-good'
  )
)
WHERE slug = 'circulair';

-- 7 tiles on a 12-col grid.
--   Row 1 (y=0..3):   afval totaal-line | restafval-line
--   Row 2 (y=4..7):   gft-line          | mix-stacked-bar over time
--   Row 3 (y=8..11):  pie current year  | choropleth restafval
--   Row 4 (y=12..15): line prognose (full-width)

UPDATE dashboard_templates
SET
  description = 'Circulaire-economie monitor: afvalstromen per inwoner — restafval, gft, papier en de overige fracties — met TSA-prognose tot 2030. Default scope is per-inwoner-kg (registry default-filter).',
  tiles = jsonb_build_array(
    jsonb_build_object(
      'id', 'c9dae1b2-0001-4009-8009-000000000001',
      'order', 0,
      'title', 'Afval per inwoner totaal',
      'description', 'Totale afvalproductie per inwoner (kg) — vergelijk met cohort, provincie en landelijk gemiddelde.',
      'chartType', 'line',
      'dataSource', 'afval',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'c9dae1b2-0001-4009-8009-000000000002',
      'order', 1,
      'title', 'Restafval trend',
      'description', 'Restafval per inwoner — kerncijfer voor circulair beleid. Dalende lijn duidt op succesvolle scheiding aan de bron.',
      'chartType', 'line',
      'dataSource', 'afval',
      'dimensions', jsonb_build_array('waste_type'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dimensionValue', 'restafval')
    ),
    jsonb_build_object(
      'id', 'c9dae1b2-0001-4009-8009-000000000003',
      'order', 2,
      'title', 'GFT trend',
      'description', 'GFT per inwoner — een stijgende lijn duidt op succesvolle scheiding van organisch materiaal.',
      'chartType', 'line',
      'dataSource', 'afval',
      'dimensions', jsonb_build_array('waste_type'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dimensionValue', 'gft')
    ),
    jsonb_build_object(
      'id', 'c9dae1b2-0001-4009-8009-000000000004',
      'order', 3,
      'title', 'Afval-mix per jaar',
      'description', 'Stapel alle fracties (gft, glas, papier, kunststof, textiel, restafval, grof restafval) per jaar — toont structurele verschuivingen.',
      'chartType', 'stacked-bar',
      'dataSource', 'afval',
      'dimensions', jsonb_build_array('waste_type'),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'c9dae1b2-0001-4009-8009-000000000005',
      'order', 4,
      'title', 'Afval-mix dit jaar',
      'description', 'Aandeel per fractie voor het geselecteerde jaar — snapshotweergave.',
      'chartType', 'pie',
      'dataSource', 'afval',
      'dimensions', jsonb_build_array('waste_type'),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'c9dae1b2-0001-4009-8009-000000000006',
      'order', 5,
      'title', 'Restafval per gemeente',
      'description', 'Kaartweergave restafval per inwoner — gemeenten met lage waarden zijn koplopers in scheiding aan de bron.',
      'chartType', 'choropleth',
      'dataSource', 'afval',
      'dimensions', jsonb_build_array('waste_type'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dimensionValue', 'restafval')
    ),
    jsonb_build_object(
      'id', 'c9dae1b2-0001-4009-8009-000000000007',
      'order', 6,
      'title', 'Afvalprognose tot 2030',
      'description', 'TSA Engine prognose afvalproductie per inwoner — proxy voor circulariteit-progressie. Confidence bounds nog niet ingevuld voor afval (alleen bevolking heeft die vandaag).',
      'chartType', 'line',
      'dataSource', 'afval',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dataOrigin', 'ruimtemeesters_prognose')
    )
  ),
  layout = jsonb_build_array(
    jsonb_build_object('i', 'c9dae1b2-0001-4009-8009-000000000001', 'x', 0, 'y',  0, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'c9dae1b2-0001-4009-8009-000000000002', 'x', 6, 'y',  0, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'c9dae1b2-0001-4009-8009-000000000003', 'x', 0, 'y',  4, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'c9dae1b2-0001-4009-8009-000000000004', 'x', 6, 'y',  4, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'c9dae1b2-0001-4009-8009-000000000005', 'x', 0, 'y',  8, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'c9dae1b2-0001-4009-8009-000000000006', 'x', 6, 'y',  8, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'c9dae1b2-0001-4009-8009-000000000007', 'x', 0, 'y', 12, 'w', 12,'h', 4)
  ),
  updated_at = NOW(),
  version = version + 1
WHERE theme_slug = 'circulair';
