-- Issue #106 / EPIC theme template audit. Cycle 13. Differentiate the
-- `afval-circulair` theme from `circulair` (#137). Same data source
-- (data_afval) but a tighter, scheiding-focused framing — fewer tiles,
-- explicit "are we improving our scheidings-percentage?" question.
--
-- `circulair` is the full circulair-economie monitor (7 tiles + prognose).
-- `afval-circulair` is the focused recycle-vs-restafval lens.

UPDATE themes
SET
  description = 'Scheidings-focus: hoe zwaar wegen recyclebare fracties vs restafval, en hoe ontwikkelt dat zich? Companion van het bredere "Circulaire Economie"-thema.',
  kpi_config = jsonb_build_array(
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
      'label', 'Glas per inwoner',
      'dataSource', 'afval',
      'dimension', 'waste_type',
      'dimensionValue', 'glas',
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
WHERE slug = 'afval-circulair';

-- 5 tiles. Tighter than `circulair` because the audience for this
-- theme is "I want to compare scheiding metrics" not "I want the full
-- circulair-monitor".
--   Row 1 (y=0..3):  restafval-line | gft-line
--   Row 2 (y=4..7):  glas-line      | papier-line
--   Row 3 (y=8..11): mix per inwoner stacked-bar (full-width)

UPDATE dashboard_templates
SET
  description = 'Scheidings-focus per fractie: kg per inwoner voor restafval, gft, glas en papier. Vergelijking met cohort/provincie/landelijk gemiddelde maakt zichtbaar waar de gemeente bovenwerks of onderwerks scoort.',
  tiles = jsonb_build_array(
    jsonb_build_object(
      'id', 'dae1b2c3-0001-400a-800a-000000000001',
      'order', 0,
      'title', 'Restafval per inwoner',
      'description', 'Restafval-kg per inwoner over tijd. Lagere waarden = betere scheiding aan de bron.',
      'chartType', 'line',
      'dataSource', 'afval',
      'dimensions', jsonb_build_array('waste_type'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dimensionValue', 'restafval')
    ),
    jsonb_build_object(
      'id', 'dae1b2c3-0001-400a-800a-000000000002',
      'order', 1,
      'title', 'GFT per inwoner',
      'description', 'GFT-kg per inwoner over tijd. Hoger duidt op succesvolle scheiding van organisch materiaal.',
      'chartType', 'line',
      'dataSource', 'afval',
      'dimensions', jsonb_build_array('waste_type'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dimensionValue', 'gft')
    ),
    jsonb_build_object(
      'id', 'dae1b2c3-0001-400a-800a-000000000003',
      'order', 2,
      'title', 'Glas per inwoner',
      'description', 'Glas-kg per inwoner. Een stabiele fractie; afwijking duidt op verschil in inzamel-infrastructuur.',
      'chartType', 'line',
      'dataSource', 'afval',
      'dimensions', jsonb_build_array('waste_type'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dimensionValue', 'glas')
    ),
    jsonb_build_object(
      'id', 'dae1b2c3-0001-400a-800a-000000000004',
      'order', 3,
      'title', 'Papier per inwoner',
      'description', 'Papier-kg per inwoner. Vergelijking met cohort toont hoe goed papier-inzameling werkt in jouw gemeente.',
      'chartType', 'line',
      'dataSource', 'afval',
      'dimensions', jsonb_build_array('waste_type'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dimensionValue', 'papier')
    ),
    jsonb_build_object(
      'id', 'dae1b2c3-0001-400a-800a-000000000005',
      'order', 4,
      'title', 'Scheidings-mix per jaar',
      'description', 'Alle fracties gestapeld per jaar — toont de absolute verhoudingen en hoe deze verschuiven.',
      'chartType', 'stacked-bar',
      'dataSource', 'afval',
      'dimensions', jsonb_build_array('waste_type'),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    )
  ),
  layout = jsonb_build_array(
    jsonb_build_object('i', 'dae1b2c3-0001-400a-800a-000000000001', 'x', 0, 'y', 0, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'dae1b2c3-0001-400a-800a-000000000002', 'x', 6, 'y', 0, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'dae1b2c3-0001-400a-800a-000000000003', 'x', 0, 'y', 4, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'dae1b2c3-0001-400a-800a-000000000004', 'x', 6, 'y', 4, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'dae1b2c3-0001-400a-800a-000000000005', 'x', 0, 'y', 8, 'w', 12,'h', 4)
  ),
  updated_at = NOW(),
  version = version + 1
WHERE theme_slug = 'afval-circulair';
