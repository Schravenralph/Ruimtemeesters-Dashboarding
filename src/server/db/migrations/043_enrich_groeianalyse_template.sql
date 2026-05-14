-- Issue #106 / EPIC theme template audit. Cycle 11 in the 2026-05-14
-- enrichment series. The `groeianalyse` theme positions itself as the
-- cross-gemeente comparison view ("Vergelijk bevolkingsgroei tussen
-- gemeenten — ontdek welke steden het snelst groeien"). Today it's a
-- bevolking-only template; expand to bevolking + huishoudens + woningen
-- so all three drivers are comparable at once with cohort/provincie/
-- landelijk-referenties standaard aan (ADR-003).

UPDATE themes
SET kpi_config = jsonb_build_array(
  jsonb_build_object(
    'label', 'Bevolking',
    'dataSource', 'bevolking',
    'format', 'compact',
    'deltaDirection', 'neutral'
  ),
  jsonb_build_object(
    'label', 'Huishoudens',
    'dataSource', 'huishoudens',
    'format', 'compact',
    'deltaDirection', 'neutral'
  ),
  jsonb_build_object(
    'label', 'Woningvoorraad',
    'dataSource', 'woningen',
    'format', 'compact',
    'deltaDirection', 'higher-is-good'
  ),
  jsonb_build_object(
    'label', '15-64 jaar',
    'dataSource', 'bevolking',
    'dimension', 'age_group',
    'dimensionValues', jsonb_build_array('15-29', '30-44', '45-64'),
    'format', 'compact',
    'deltaDirection', 'higher-is-good'
  ),
  jsonb_build_object(
    'label', '65+ jaar',
    'dataSource', 'bevolking',
    'dimension', 'age_group',
    'dimensionValues', jsonb_build_array('65-74', '75+'),
    'format', 'compact',
    'deltaDirection', 'neutral'
  )
)
WHERE slug = 'groeianalyse';

-- 7 tiles, comparison framing: all line tiles get cohort/provincie/landelijke
-- references for direct comparison; choropleth tiles let advisors see the
-- gemeente-spreiding op kaart.
--   Row 1 (y=0..3):   bevolking-line ref | huishoudens-line ref
--   Row 2 (y=4..7):   woningen-line ref  | bevolking-per-age-group line
--   Row 3 (y=8..11):  bevolking-choropleth | woningen-choropleth
--   Row 4 (y=12..15): stacked-bar leeftijdsopbouw (full-width)

UPDATE dashboard_templates
SET
  description = 'Vergelijk je gemeente met cohort, provincie en landelijk gemiddelde over de drie groeisignalen: bevolking, huishoudens en woningvoorraad. Plus leeftijdsgroep-groei en spreiding op kaart.',
  tiles = jsonb_build_array(
    jsonb_build_object(
      'id', 'b8c9dae1-0001-4008-8008-000000000001',
      'order', 0,
      'title', 'Bevolkingsgroei',
      'description', 'Inwoneraantal in mijn gemeente vergeleken met cohort, provincie en landelijk gemiddelde.',
      'chartType', 'line',
      'dataSource', 'bevolking',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'b8c9dae1-0001-4008-8008-000000000002',
      'order', 1,
      'title', 'Huishoudensgroei',
      'description', 'Huishoudens versus cohort — toont of de groei in huishoudens sneller of langzamer gaat dan in vergelijkbare gemeenten.',
      'chartType', 'line',
      'dataSource', 'huishoudens',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'b8c9dae1-0001-4008-8008-000000000003',
      'order', 2,
      'title', 'Woningvoorraadgroei',
      'description', 'Woningvoorraad versus cohort/provincie/landelijk — toont of de aanbodzijde de demografische groei volgt.',
      'chartType', 'line',
      'dataSource', 'woningen',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'b8c9dae1-0001-4008-8008-000000000004',
      'order', 3,
      'title', 'Groei per leeftijdsgroep',
      'description', 'Welke leeftijdsgroepen groeien sneller? Lijn per leeftijdsgroep — handig om verjongings- of vergrijzingsdynamiek te zien.',
      'chartType', 'line',
      'dataSource', 'bevolking',
      'dimensions', jsonb_build_array('age_group'),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'b8c9dae1-0001-4008-8008-000000000005',
      'order', 4,
      'title', 'Bevolkingsspreiding',
      'description', 'Kaartweergave bevolking per gemeente — ontdek welke gemeenten qua omvang vergelijkbaar zijn.',
      'chartType', 'choropleth',
      'dataSource', 'bevolking',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'b8c9dae1-0001-4008-8008-000000000006',
      'order', 5,
      'title', 'Woningvoorraad spreiding',
      'description', 'Kaartweergave woningvoorraad per gemeente — leg naast bevolking om de aanbod/vraag-balans visueel te checken.',
      'chartType', 'choropleth',
      'dataSource', 'woningen',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'b8c9dae1-0001-4008-8008-000000000007',
      'order', 6,
      'title', 'Leeftijdsopbouw man/vrouw',
      'description', 'Bevolkingspiramide-achtige weergave naar leeftijdsgroep × geslacht — toont structurele verschillen met cohort.',
      'chartType', 'stacked-bar',
      'dataSource', 'bevolking',
      'dimensions', jsonb_build_array('age_group', 'gender'),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    )
  ),
  layout = jsonb_build_array(
    jsonb_build_object('i', 'b8c9dae1-0001-4008-8008-000000000001', 'x', 0, 'y',  0, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'b8c9dae1-0001-4008-8008-000000000002', 'x', 6, 'y',  0, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'b8c9dae1-0001-4008-8008-000000000003', 'x', 0, 'y',  4, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'b8c9dae1-0001-4008-8008-000000000004', 'x', 6, 'y',  4, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'b8c9dae1-0001-4008-8008-000000000005', 'x', 0, 'y',  8, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'b8c9dae1-0001-4008-8008-000000000006', 'x', 6, 'y',  8, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'b8c9dae1-0001-4008-8008-000000000007', 'x', 0, 'y', 12, 'w', 12,'h', 4)
  ),
  updated_at = NOW(),
  version = version + 1
WHERE theme_slug = 'groeianalyse';
