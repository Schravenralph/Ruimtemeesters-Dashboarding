-- Issue #106 (EPIC theme template audit & gap closure). Rewrite the
-- system woningen template from a 4-tile placeholder (no layout, no
-- descriptions, single KPI) into a 7-tile, fully-positioned, advisor-
-- facing dashboard using only data already in this warehouse:
--   data_woningen        — CBS 82550NED (tenure_type, dwelling_type)
--   data_huishoudens     — CBS 71486NED
--   data_woningtekort    — CBS-derived + ABF Primos forecast rows
--                          (project_data_integrity.md, project_forecast_confidence.md)
--
-- Per ADR-003, references (cohort/provincie/land) are presentation-level
-- defaults via DEFAULT_REFERENCE_VISIBILITY in PresentationContext.tsx, so
-- no per-tile flag is needed — the renderer will overlay them automatically
-- when the focal geo is a gemeente.
--
-- Idempotent: uses UPDATE on existing rows, safe to re-run.

-- ── KPI strip (themes.kpi_config) ─────────────────────────────────────────
UPDATE themes
SET kpi_config = jsonb_build_array(
  jsonb_build_object(
    'label', 'Woningvoorraad',
    'dataSource', 'woningen',
    'format', 'compact',
    'deltaDirection', 'higher-is-good'
  ),
  jsonb_build_object(
    'label', 'Woningtekort',
    'dataSource', 'woningtekort',
    'format', 'compact',
    'deltaDirection', 'higher-is-bad'
  ),
  jsonb_build_object(
    'label', 'Huishoudens',
    'dataSource', 'huishoudens',
    'format', 'compact',
    'deltaDirection', 'neutral'
  )
)
WHERE slug = 'woningen';

-- ── dashboard_templates.tiles + .layout ───────────────────────────────────
-- Seven tiles laid out on a 12-column grid:
--
--   Row 1 (y=0..3):   [ tenure-stacked  | voorraad-line ]
--   Row 2 (y=4..7):   [ tekort-line     | huishoudens-line ]
--   Row 3 (y=8..11):  [ choropleth full-width                                ]
--   Row 4 (y=12..15): [ prognose-envelope | dwelling-type-bar ]
--
-- Tile IDs are stable UUIDs so any project that subsequently overrides
-- a tile's chart settings keeps a stable handle.

UPDATE dashboard_templates
SET
  description = 'Woningvoorraad, woningtekort en huishoudensontwikkeling op gemeenteniveau — met cohort/provincie/landelijke referenties (ADR-003) en ABF Primos prognose.',
  tiles = jsonb_build_array(
    jsonb_build_object(
      'id', 'a1b2c3d4-0001-4001-8001-000000000001',
      'order', 0,
      'title', 'Woningvoorraad naar eigendomstype',
      'description', 'Stapelt huur- en koopwoningen per jaar — laat zien hoe de eigendomsverhouding zich ontwikkelt.',
      'chartType', 'stacked-bar',
      'dataSource', 'woningen',
      'dimensions', jsonb_build_array('tenure_type'),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'a1b2c3d4-0001-4001-8001-000000000002',
      'order', 1,
      'title', 'Woningvoorraad ontwikkeling',
      'description', 'Totale woningvoorraad over de tijd — vergelijk met cohort, provincie en landelijk gemiddelde.',
      'chartType', 'line',
      'dataSource', 'woningen',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'a1b2c3d4-0001-4001-8001-000000000003',
      'order', 2,
      'title', 'Woningtekort over tijd',
      'description', 'Het verschil tussen vraag (huishoudens) en aanbod (woningvoorraad) — kerncijfer voor woonbeleid.',
      'chartType', 'line',
      'dataSource', 'woningtekort',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'a1b2c3d4-0001-4001-8001-000000000004',
      'order', 3,
      'title', 'Huishoudensontwikkeling',
      'description', 'Aantal huishoudens — drijft de woningvraag. Vergelijking met referentiegemeenten helpt regionale dynamiek te zien.',
      'chartType', 'line',
      'dataSource', 'huishoudens',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'a1b2c3d4-0001-4001-8001-000000000005',
      'order', 4,
      'title', 'Woningvoorraad per gemeente',
      'description', 'Kaartweergave van de woningvoorraad over Nederland — klik op een gemeente om in te zoomen.',
      'chartType', 'choropleth',
      'dataSource', 'woningen',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'a1b2c3d4-0001-4001-8001-000000000006',
      'order', 5,
      'title', 'Bevolkingsprognose per leeftijdsgroep',
      'description', 'TSA Engine prognose (ruimtemeesters_prognose) tot 2030 uitgesplitst naar leeftijdsgroep — laat de demografische verschuiving zien die de toekomstige woningvraag bepaalt.',
      'chartType', 'line',
      'dataSource', 'bevolking',
      'dimensions', jsonb_build_array('age_group'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dataOrigin', 'ruimtemeesters_prognose')
    ),
    jsonb_build_object(
      'id', 'a1b2c3d4-0001-4001-8001-000000000007',
      'order', 6,
      'title', 'Woningen naar type',
      'description', 'Eengezins versus meergezins — verschuift de samenstelling van de voorraad?',
      'chartType', 'bar',
      'dataSource', 'woningen',
      'dimensions', jsonb_build_array('dwelling_type'),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    )
  ),
  layout = jsonb_build_array(
    jsonb_build_object('i', 'a1b2c3d4-0001-4001-8001-000000000001', 'x', 0, 'y',  0, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'a1b2c3d4-0001-4001-8001-000000000002', 'x', 6, 'y',  0, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'a1b2c3d4-0001-4001-8001-000000000003', 'x', 0, 'y',  4, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'a1b2c3d4-0001-4001-8001-000000000004', 'x', 6, 'y',  4, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'a1b2c3d4-0001-4001-8001-000000000005', 'x', 0, 'y',  8, 'w', 12,'h', 4),
    jsonb_build_object('i', 'a1b2c3d4-0001-4001-8001-000000000006', 'x', 0, 'y', 12, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'a1b2c3d4-0001-4001-8001-000000000007', 'x', 6, 'y', 12, 'w', 6, 'h', 4)
  ),
  updated_at = NOW(),
  version = version + 1
WHERE theme_slug = 'woningen';
