-- Issue #106 / EPIC theme template audit. Rewrite the `woningtekort`
-- system template from a 4-tile, single-source, no-layout placeholder
-- into an 8-tile dashboard that actually uses the 10-metric goldmine
-- in data_woningtekort.
--
-- Time-series-capable metrics (2012-2025): tekort, tekort_percentage,
-- woningbehoefte. The remaining 7 (nieuwbouw, sloop, saldo,
-- voorraad_begin/eind, overige_toevoeging/onttrekking) only have 2024
-- data — they get a snapshot-bar tile, not a line tile.
--
-- Per-tile dimensionValue filter requires the DashboardTile change
-- that ships with this PR.

UPDATE themes
SET kpi_config = jsonb_build_array(
  jsonb_build_object(
    'label', 'Woningtekort (%)',
    'dataSource', 'woningtekort',
    'dimension', 'metric',
    'dimensionValue', 'tekort_percentage',
    'format', 'percent',
    'deltaDirection', 'higher-is-bad'
  ),
  jsonb_build_object(
    'label', 'Woningtekort absoluut',
    'dataSource', 'woningtekort',
    'dimension', 'metric',
    'dimensionValue', 'tekort',
    'format', 'compact',
    'deltaDirection', 'higher-is-bad'
  ),
  jsonb_build_object(
    'label', 'Woningbehoefte',
    'dataSource', 'woningtekort',
    'dimension', 'metric',
    'dimensionValue', 'woningbehoefte',
    'format', 'compact',
    'deltaDirection', 'neutral'
  ),
  jsonb_build_object(
    'label', 'Nieuwbouw 2024',
    'dataSource', 'woningtekort',
    'dimension', 'metric',
    'dimensionValue', 'nieuwbouw',
    'format', 'compact',
    'deltaDirection', 'higher-is-good'
  )
)
WHERE slug = 'woningtekort';

-- 8 tiles on a 12-col grid.
-- Row 1 (y=0..3):    [ line tekort_percentage         | line tekort_absoluut         ]
-- Row 2 (y=4..7):    [ line woningbehoefte            | bar voorraadmutatie 2024     ]
-- Row 3 (y=8..11):   [ stacked-bar toevoeging/onttrekking 2024  | choropleth tekort_pct  ]
-- Row 4 (y=12..15):  [ table overzicht (full-width)                                     ]

UPDATE dashboard_templates
SET
  description = 'Woningtekort, woningbehoefte en voorraadmutaties op gemeenteniveau — kerncijfers voor wonenbeleid met cohort/provincie/landelijke vergelijking.',
  tiles = jsonb_build_array(
    jsonb_build_object(
      'id', 'c3d4e5f6-0001-4003-8003-000000000001',
      'order', 0,
      'title', 'Woningtekort percentage',
      'description', 'Tekort als percentage van de woningbehoefte — kerncijfer (NL-gemiddelde ~4.8% in 2024). Vergelijking met cohort, provincie en landelijk niveau.',
      'chartType', 'line',
      'dataSource', 'woningtekort',
      'dimensions', jsonb_build_array('metric'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dimensionValue', 'tekort_percentage')
    ),
    jsonb_build_object(
      'id', 'c3d4e5f6-0001-4003-8003-000000000002',
      'order', 1,
      'title', 'Woningtekort absoluut',
      'description', 'Aantal woningen tekort (verschil tussen vraag en aanbod).',
      'chartType', 'line',
      'dataSource', 'woningtekort',
      'dimensions', jsonb_build_array('metric'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dimensionValue', 'tekort')
    ),
    jsonb_build_object(
      'id', 'c3d4e5f6-0001-4003-8003-000000000003',
      'order', 2,
      'title', 'Woningbehoefte ontwikkeling',
      'description', 'Totale woningbehoefte (aantal huishoudens) — drijft het tekort. Een groeiende behoefte zonder navenante nieuwbouw vergroot het tekort.',
      'chartType', 'line',
      'dataSource', 'woningtekort',
      'dimensions', jsonb_build_array('metric'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dimensionValue', 'woningbehoefte')
    ),
    jsonb_build_object(
      'id', 'c3d4e5f6-0001-4003-8003-000000000004',
      'order', 3,
      'title', 'Voorraadmutatie 2024',
      'description', 'Alle voorraadmutaties van 2024 in één beeld: nieuwbouw, sloop, saldo, overige toevoegingen en onttrekkingen.',
      'chartType', 'bar',
      'dataSource', 'woningtekort',
      'dimensions', jsonb_build_array('metric'),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'c3d4e5f6-0001-4003-8003-000000000005',
      'order', 4,
      'title', 'Voorraad begin → eind 2024',
      'description', 'Vergelijk voorraad begin met voorraad eind van het jaar — zichtbaar maken van netto verandering.',
      'chartType', 'stacked-bar',
      'dataSource', 'woningtekort',
      'dimensions', jsonb_build_array('metric'),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'c3d4e5f6-0001-4003-8003-000000000006',
      'order', 5,
      'title', 'Tekort per gemeente',
      'description', 'Kaartweergave van het woningtekort-percentage over Nederland — klik op een gemeente om in te zoomen.',
      'chartType', 'choropleth',
      'dataSource', 'woningtekort',
      'dimensions', jsonb_build_array('metric'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dimensionValue', 'tekort_percentage')
    ),
    jsonb_build_object(
      'id', 'c3d4e5f6-0001-4003-8003-000000000007',
      'order', 6,
      'title', 'Saldo voorraadmutatie 2024',
      'description', 'Netto verandering van de voorraad — positief bij voldoende nieuwbouw, negatief bij sloop > toevoegingen.',
      'chartType', 'bar',
      'dataSource', 'woningtekort',
      'dimensions', jsonb_build_array('metric'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dimensionValue', 'saldo')
    ),
    jsonb_build_object(
      'id', 'c3d4e5f6-0001-4003-8003-000000000008',
      'order', 7,
      'title', 'Overzicht per jaar',
      'description', 'Tabel: tekort, behoefte en tekort-percentage per jaar — handig voor exact aflezen of CSV-export.',
      'chartType', 'table',
      'dataSource', 'woningtekort',
      'dimensions', jsonb_build_array('metric'),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    )
  ),
  layout = jsonb_build_array(
    jsonb_build_object('i', 'c3d4e5f6-0001-4003-8003-000000000001', 'x', 0, 'y',  0, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'c3d4e5f6-0001-4003-8003-000000000002', 'x', 6, 'y',  0, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'c3d4e5f6-0001-4003-8003-000000000003', 'x', 0, 'y',  4, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'c3d4e5f6-0001-4003-8003-000000000004', 'x', 6, 'y',  4, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'c3d4e5f6-0001-4003-8003-000000000005', 'x', 0, 'y',  8, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'c3d4e5f6-0001-4003-8003-000000000006', 'x', 6, 'y',  8, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'c3d4e5f6-0001-4003-8003-000000000007', 'x', 0, 'y', 12, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'c3d4e5f6-0001-4003-8003-000000000008', 'x', 6, 'y', 12, 'w', 6, 'h', 4)
  ),
  updated_at = NOW(),
  version = version + 1
WHERE theme_slug = 'woningtekort';
