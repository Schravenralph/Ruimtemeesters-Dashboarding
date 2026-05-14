-- Issue #106 / EPIC theme template audit. Cycle 16. The
-- `hernieuwbare-energie` theme is data-limited: data_hernieuwbaar
-- has only one energy_source value today (zonnepanelen). Ship a
-- tight zonne-focused template that explicitly acknowledges the gap
-- in the description; wind/biomassa tiles will follow once the sync
-- regression is fixed.
--
-- Two metrics available: capaciteit_mw and aantal_installaties. Both
-- get their own line tile.

UPDATE themes
SET
  description = 'Hernieuwbare-energie monitor. Vandaag enkel zonnepanelen — wind, biomassa en warmtepompen volgen zodra de hernieuwbaar-sync alle bronnen pulleert.',
  kpi_config = jsonb_build_array(
    jsonb_build_object(
      'label', 'Zonne-capaciteit (MW)',
      'dataSource', 'hernieuwbaar',
      'dimension', 'metric',
      'dimensionValue', 'capaciteit_mw',
      'format', 'compact',
      'deltaDirection', 'higher-is-good'
    ),
    jsonb_build_object(
      'label', 'Aantal installaties',
      'dataSource', 'hernieuwbaar',
      'dimension', 'metric',
      'dimensionValue', 'aantal_installaties',
      'format', 'compact',
      'deltaDirection', 'higher-is-good'
    )
  )
WHERE slug = 'hernieuwbare-energie';

-- 5 tiles. Tight zonne-focus until data fills in.
--   Row 1 (y=0..3):  capaciteit-line | installaties-line
--   Row 2 (y=4..7):  capaciteit-choropleth | installaties-choropleth
--   Row 3 (y=8..11): prognose-line (full-width)

UPDATE dashboard_templates
SET
  description = 'Zonne-energie monitor: geinstalleerde capaciteit (MW) en aantal installaties per gemeente, met TSA-prognose tot 2031. Andere hernieuwbare bronnen (wind, biomassa, warmtepompen) volgen zodra ze gesynct worden — vandaag bevat data_hernieuwbaar alleen zonne-cijfers.',
  tiles = jsonb_build_array(
    jsonb_build_object(
      'id', 'c3d4e5f6-0001-400d-800d-000000000001',
      'order', 0,
      'title', 'Zonne-capaciteit (MW)',
      'description', 'Geinstalleerde zonne-capaciteit per jaar. Vergelijking met cohort/provincie/landelijk toont of de gemeente meer of minder aan zon doet dan vergelijkbare buren.',
      'chartType', 'line',
      'dataSource', 'hernieuwbaar',
      'dimensions', jsonb_build_array('metric'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dimensionValue', 'capaciteit_mw')
    ),
    jsonb_build_object(
      'id', 'c3d4e5f6-0001-400d-800d-000000000002',
      'order', 1,
      'title', 'Aantal zonne-installaties',
      'description', 'Aantal individuele installaties — proxy voor de spreiding (veel kleine installaties vs. enkele grote).',
      'chartType', 'line',
      'dataSource', 'hernieuwbaar',
      'dimensions', jsonb_build_array('metric'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dimensionValue', 'aantal_installaties')
    ),
    jsonb_build_object(
      'id', 'c3d4e5f6-0001-400d-800d-000000000003',
      'order', 2,
      'title', 'Zonne-capaciteit per gemeente',
      'description', 'Kaartweergave van geinstalleerde MW per gemeente.',
      'chartType', 'choropleth',
      'dataSource', 'hernieuwbaar',
      'dimensions', jsonb_build_array('metric'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dimensionValue', 'capaciteit_mw')
    ),
    jsonb_build_object(
      'id', 'c3d4e5f6-0001-400d-800d-000000000004',
      'order', 3,
      'title', 'Aantal installaties per gemeente',
      'description', 'Kaartweergave aantal installaties per gemeente.',
      'chartType', 'choropleth',
      'dataSource', 'hernieuwbaar',
      'dimensions', jsonb_build_array('metric'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dimensionValue', 'aantal_installaties')
    ),
    jsonb_build_object(
      'id', 'c3d4e5f6-0001-400d-800d-000000000005',
      'order', 4,
      'title', 'Zonne-prognose tot 2031',
      'description', 'TSA Engine forecast capaciteit. Confidence bounds nog niet ingevuld voor hernieuwbaar (alleen bevolking heeft die vandaag).',
      'chartType', 'line',
      'dataSource', 'hernieuwbaar',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dataOrigin', 'ruimtemeesters_prognose')
    )
  ),
  layout = jsonb_build_array(
    jsonb_build_object('i', 'c3d4e5f6-0001-400d-800d-000000000001', 'x', 0, 'y', 0, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'c3d4e5f6-0001-400d-800d-000000000002', 'x', 6, 'y', 0, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'c3d4e5f6-0001-400d-800d-000000000003', 'x', 0, 'y', 4, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'c3d4e5f6-0001-400d-800d-000000000004', 'x', 6, 'y', 4, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'c3d4e5f6-0001-400d-800d-000000000005', 'x', 0, 'y', 8, 'w', 12,'h', 4)
  ),
  updated_at = NOW(),
  version = version + 1
WHERE theme_slug = 'hernieuwbare-energie';
