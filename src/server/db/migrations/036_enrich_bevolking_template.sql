-- Issue #106 / EPIC theme template audit. Rewrite the `bevolking` system
-- template from a 6-tile no-layout placeholder into a 7-tile, positioned,
-- advisor-facing demografisch dashboard.
--
-- Built entirely on data already in `data_bevolking` (153k rows, 836 geos,
-- 1988-2060 across cbs_actuals + cbs_prognose + ruimtemeesters_prognose).
-- Same idempotent UPDATE pattern as migration 035.

UPDATE themes
SET kpi_config = jsonb_build_array(
  jsonb_build_object(
    'label', 'Inwoners',
    'dataSource', 'bevolking',
    'format', 'compact',
    'deltaDirection', 'neutral'
  ),
  -- Vergrijzing — 75+ als aandeel van de totale bevolking.
  jsonb_build_object(
    'label', 'Aantal 75+',
    'dataSource', 'bevolking',
    'dimension', 'age_group',
    'dimensionValue', '75+',
    'format', 'compact',
    'deltaDirection', 'neutral'
  ),
  -- Jeugd — onderkant leeftijdspiramide, complementair aan 75+.
  jsonb_build_object(
    'label', 'Aantal 0-14',
    'dataSource', 'bevolking',
    'dimension', 'age_group',
    'dimensionValue', '0-14',
    'format', 'compact',
    'deltaDirection', 'neutral'
  ),
  -- Beroepsbevolking-proxy: 15-64 totaal via multi-bin sum (linear aggregate
  -- per ThemeKpiEntry.dimensionValues contract).
  jsonb_build_object(
    'label', 'Beroepsbevolking (15-64)',
    'dataSource', 'bevolking',
    'dimension', 'age_group',
    'dimensionValues', jsonb_build_array('15-29', '30-44', '45-64'),
    'format', 'compact',
    'deltaDirection', 'higher-is-good'
  )
)
WHERE slug = 'bevolking';

-- ── 7 tiles on a 12-col react-grid-layout ────────────────────────────────
--
--   Row 1 (y=0..3):   [ totaal-line    | prognose-line+envelope ]
--   Row 2 (y=4..7):   [ leeftijd-stacked | geslacht-pie         ]
--   Row 3 (y=8..11):  [ piramide-mv      | overzicht-table       ]
--   Row 4 (y=12..15): [ choropleth full-width                   ]

UPDATE dashboard_templates
SET
  description = 'Demografische ontwikkeling: totale bevolking, leeftijdsopbouw, geslachtsverdeling, vergrijzing en prognose tot 2030 met onzekerheidsmarge — drijver van huishoudens- en woningvraag.',
  tiles = jsonb_build_array(
    jsonb_build_object(
      'id', 'b2c3d4e5-0001-4002-8002-000000000001',
      'order', 0,
      'title', 'Bevolking totaal over tijd',
      'description', 'Inwoneraantal sinds 1988 — vergelijk met cohort, provincie en landelijk gemiddelde om regionale dynamiek te zien.',
      'chartType', 'line',
      'dataSource', 'bevolking',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'b2c3d4e5-0001-4002-8002-000000000002',
      'order', 1,
      'title', 'Bevolkingsprognose tot 2030',
      'description', 'TSA Engine prognose (ruimtemeesters_prognose) met 25/75-percentiel onzekerheidsmarge — kerncijfer voor lange-termijn planning.',
      'chartType', 'line',
      'dataSource', 'bevolking',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('envelope', true, 'dataOrigin', 'ruimtemeesters_prognose')
    ),
    jsonb_build_object(
      'id', 'b2c3d4e5-0001-4002-8002-000000000003',
      'order', 2,
      'title', 'Bevolking naar leeftijdsgroep',
      'description', 'Verdeling over zes leeftijdsgroepen (0-14, 15-29, 30-44, 45-64, 65-74, 75+) voor het geselecteerde jaar.',
      'chartType', 'stacked-bar',
      'dataSource', 'bevolking',
      'dimensions', jsonb_build_array('age_group'),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'b2c3d4e5-0001-4002-8002-000000000004',
      'order', 3,
      'title', 'Bevolking naar geslacht',
      'description', 'Man/vrouw-verhouding voor het geselecteerde jaar.',
      'chartType', 'pie',
      'dataSource', 'bevolking',
      'dimensions', jsonb_build_array('gender'),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'b2c3d4e5-0001-4002-8002-000000000005',
      'order', 4,
      'title', 'Leeftijdsopbouw man/vrouw',
      'description', 'Bevolkingspiramide-achtige weergave: leeftijdsgroep × geslacht.',
      'chartType', 'stacked-bar',
      'dataSource', 'bevolking',
      'dimensions', jsonb_build_array('age_group', 'gender'),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'b2c3d4e5-0001-4002-8002-000000000006',
      'order', 5,
      'title', 'Bevolkingsoverzicht naar leeftijd',
      'description', 'Tabelweergave per leeftijdsgroep — handig om absolute aantallen exact af te lezen.',
      'chartType', 'table',
      'dataSource', 'bevolking',
      'dimensions', jsonb_build_array('age_group'),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'b2c3d4e5-0001-4002-8002-000000000007',
      'order', 6,
      'title', 'Bevolking per gemeente',
      'description', 'Kaartweergave voor heel Nederland — klik op een gemeente om in te zoomen.',
      'chartType', 'choropleth',
      'dataSource', 'bevolking',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    )
  ),
  layout = jsonb_build_array(
    jsonb_build_object('i', 'b2c3d4e5-0001-4002-8002-000000000001', 'x', 0, 'y',  0, 'w', 6,  'h', 4),
    jsonb_build_object('i', 'b2c3d4e5-0001-4002-8002-000000000002', 'x', 6, 'y',  0, 'w', 6,  'h', 4),
    jsonb_build_object('i', 'b2c3d4e5-0001-4002-8002-000000000003', 'x', 0, 'y',  4, 'w', 6,  'h', 4),
    jsonb_build_object('i', 'b2c3d4e5-0001-4002-8002-000000000004', 'x', 6, 'y',  4, 'w', 6,  'h', 4),
    jsonb_build_object('i', 'b2c3d4e5-0001-4002-8002-000000000005', 'x', 0, 'y',  8, 'w', 6,  'h', 4),
    jsonb_build_object('i', 'b2c3d4e5-0001-4002-8002-000000000006', 'x', 6, 'y',  8, 'w', 6,  'h', 4),
    jsonb_build_object('i', 'b2c3d4e5-0001-4002-8002-000000000007', 'x', 0, 'y', 12, 'w', 12, 'h', 4)
  ),
  updated_at = NOW(),
  version = version + 1
WHERE theme_slug = 'bevolking';
