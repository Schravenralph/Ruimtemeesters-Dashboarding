-- Issue #106 / EPIC theme template audit. Seventh template-enrichment cycle.
-- The `prognose` theme is currently a bevolking-only template. Repurpose
-- it as the cross-source forecast dashboard: one tile per
-- prognose-capable source (bevolking, energie, hernieuwbaar, afval) so
-- advisors can see all four future-views side by side.
--
-- Only `bevolking` has populated confidence bounds today (per
-- project_forecast_confidence.md) — the other three sources have
-- ruimtemeesters_prognose rows but with empty confidence_lower/upper
-- columns. Tiles for those three are line-only without envelope.

UPDATE themes
SET kpi_config = jsonb_build_array(
  jsonb_build_object(
    'label', 'Bevolking 2030',
    'dataSource', 'bevolking',
    'format', 'compact',
    'deltaDirection', 'neutral'
  ),
  jsonb_build_object(
    'label', 'Energieverbruik 2030 (TJ)',
    'dataSource', 'energie',
    'format', 'compact',
    'deltaDirection', 'higher-is-bad'
  ),
  jsonb_build_object(
    'label', 'Hernieuwbare capaciteit 2030',
    'dataSource', 'hernieuwbaar',
    'format', 'compact',
    'deltaDirection', 'higher-is-good'
  ),
  jsonb_build_object(
    'label', 'Afval per inwoner 2030',
    'dataSource', 'afval',
    'format', 'compact',
    'deltaDirection', 'higher-is-bad'
  )
)
WHERE slug = 'prognose';

-- 8 tiles. Each prognose-capable source gets one line tile (with
-- envelope iff confidence bounds exist) + one supporting bar tile.
--   Row 1 (y=0..3):   bevolking-line+envelope (2x wide) | energie-line
--   Row 2 (y=4..7):   hernieuwbaar-line                 | afval-line
--   Row 3 (y=8..11):  bevolking-prognose by age_group (full-width)
--   Row 4 (y=12..15): energie-prognose by fuel_type     | afval-prognose by waste_type

UPDATE dashboard_templates
SET
  description = 'TSA Engine prognoses tot 2030 — bevolking (met onzekerheidsmarge), energieverbruik, hernieuwbare capaciteit en afval. Alleen bevolking heeft vandaag p25/p75 bounds; de overige drie sources hebben de prognose-rijen maar nog niet de confidence-kolommen.',
  tiles = jsonb_build_array(
    jsonb_build_object(
      'id', 'a7b8c9da-0001-4007-8007-000000000001',
      'order', 0,
      'title', 'Bevolkingsprognose met onzekerheidsmarge',
      'description', 'TSA Engine forecast — p25/p75 envelope toont onzekerheid. Bevolking is vandaag de enige bron met confidence bounds.',
      'chartType', 'line',
      'dataSource', 'bevolking',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('envelope', true, 'dataOrigin', 'ruimtemeesters_prognose')
    ),
    jsonb_build_object(
      'id', 'a7b8c9da-0001-4007-8007-000000000002',
      'order', 1,
      'title', 'Energieverbruik prognose',
      'description', 'TSA Engine forecast woninggebonden energieverbruik (TJ). Confidence bounds nog niet beschikbaar.',
      'chartType', 'line',
      'dataSource', 'energie',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dataOrigin', 'ruimtemeesters_prognose')
    ),
    jsonb_build_object(
      'id', 'a7b8c9da-0001-4007-8007-000000000003',
      'order', 2,
      'title', 'Hernieuwbare capaciteit prognose',
      'description', 'TSA forecast — vandaag enkel zonnepanelen, uit te breiden zodra wind/biomassa-sync werkt.',
      'chartType', 'line',
      'dataSource', 'hernieuwbaar',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dataOrigin', 'ruimtemeesters_prognose')
    ),
    jsonb_build_object(
      'id', 'a7b8c9da-0001-4007-8007-000000000004',
      'order', 3,
      'title', 'Afval per inwoner prognose',
      'description', 'TSA forecast afvalproductie per inwoner (kg) — proxy voor circulaire-economie-progressie.',
      'chartType', 'line',
      'dataSource', 'afval',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dataOrigin', 'ruimtemeesters_prognose')
    ),
    jsonb_build_object(
      'id', 'a7b8c9da-0001-4007-8007-000000000005',
      'order', 4,
      'title', 'Bevolkingsprognose per leeftijdsgroep',
      'description', 'Demografische verschuiving zichtbaar maken — welke leeftijdsgroepen groeien, welke krimpen?',
      'chartType', 'line',
      'dataSource', 'bevolking',
      'dimensions', jsonb_build_array('age_group'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dataOrigin', 'ruimtemeesters_prognose')
    ),
    jsonb_build_object(
      'id', 'a7b8c9da-0001-4007-8007-000000000006',
      'order', 5,
      'title', 'Energieprognose naar brandstof',
      'description', 'Verschuiving van aardgas naar elektriciteit/stadsverwarming in de woningvoorraad — kerngegeven voor de gemeentelijke energietransitie.',
      'chartType', 'line',
      'dataSource', 'energie',
      'dimensions', jsonb_build_array('fuel_type'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dataOrigin', 'ruimtemeesters_prognose')
    ),
    jsonb_build_object(
      'id', 'a7b8c9da-0001-4007-8007-000000000007',
      'order', 6,
      'title', 'Afvalprognose naar type',
      'description', 'Verschuiving in afval-samenstelling — minder restafval, meer scheidingscategorieën is een typisch beleidsdoel.',
      'chartType', 'line',
      'dataSource', 'afval',
      'dimensions', jsonb_build_array('waste_type'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dataOrigin', 'ruimtemeesters_prognose')
    ),
    jsonb_build_object(
      'id', 'a7b8c9da-0001-4007-8007-000000000008',
      'order', 7,
      'title', 'Bevolking choropleth 2030',
      'description', 'Verwachte bevolking per gemeente in 2030 — kaartweergave van de prognose.',
      'chartType', 'choropleth',
      'dataSource', 'bevolking',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dataOrigin', 'ruimtemeesters_prognose')
    )
  ),
  layout = jsonb_build_array(
    jsonb_build_object('i', 'a7b8c9da-0001-4007-8007-000000000001', 'x', 0, 'y',  0, 'w', 8, 'h', 4),
    jsonb_build_object('i', 'a7b8c9da-0001-4007-8007-000000000002', 'x', 8, 'y',  0, 'w', 4, 'h', 4),
    jsonb_build_object('i', 'a7b8c9da-0001-4007-8007-000000000003', 'x', 0, 'y',  4, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'a7b8c9da-0001-4007-8007-000000000004', 'x', 6, 'y',  4, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'a7b8c9da-0001-4007-8007-000000000005', 'x', 0, 'y',  8, 'w', 12,'h', 4),
    jsonb_build_object('i', 'a7b8c9da-0001-4007-8007-000000000006', 'x', 0, 'y', 12, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'a7b8c9da-0001-4007-8007-000000000007', 'x', 6, 'y', 12, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'a7b8c9da-0001-4007-8007-000000000008', 'x', 0, 'y', 16, 'w', 12,'h', 4)
  ),
  updated_at = NOW(),
  version = version + 1
WHERE theme_slug = 'prognose';
