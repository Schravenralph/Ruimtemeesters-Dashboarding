-- Issue #106 / EPIC theme template audit. Sixth template-enrichment cycle.
-- Cross-source overzicht template — the "demo for wethouders" template
-- that combines all four wonen sources into one narrative.
--
-- Sources: data_bevolking + data_huishoudens + data_woningen +
-- data_woningtekort. All four are now at quality after the
-- 2026-05-14 cycles, so this template just composes them.

UPDATE themes
SET kpi_config = jsonb_build_array(
  jsonb_build_object(
    'label', 'Inwoners',
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
    'label', 'Woningtekort (%)',
    'dataSource', 'woningtekort',
    'dimension', 'metric',
    'dimensionValue', 'tekort_percentage',
    'format', 'percent',
    'deltaDirection', 'higher-is-bad'
  ),
  jsonb_build_object(
    'label', 'Vergrijzing (75+)',
    'dataSource', 'bevolking',
    'dimension', 'age_group',
    'dimensionValue', '75+',
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
  )
)
WHERE slug = 'overzicht';

-- 8 tiles spanning all four wonen sources.
--   Row 1 (y=0..3):   bevolking line | huishoudens line
--   Row 2 (y=4..7):   woningen line  | woningtekort percentage line
--   Row 3 (y=8..11):  bevolking-prognose line+envelope | choropleth woningvoorraad
--   Row 4 (y=12..15): stacked-bar woningen by dwelling_type | nieuwbouw bar 2024

UPDATE dashboard_templates
SET
  description = 'Het complete plaatje per gemeente: bevolking + huishoudens + woningvoorraad + woningtekort, met TSA-prognose tot 2030 — geschikt om aan een wethouder te tonen.',
  tiles = jsonb_build_array(
    jsonb_build_object(
      'id', 'f6a7b8c9-0001-4006-8006-000000000001',
      'order', 0,
      'title', 'Bevolking totaal',
      'description', 'Inwoneraantal over de tijd — vergelijk met cohort, provincie en landelijk gemiddelde.',
      'chartType', 'line',
      'dataSource', 'bevolking',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'f6a7b8c9-0001-4006-8006-000000000002',
      'order', 1,
      'title', 'Huishoudens totaal',
      'description', 'Aantal huishoudens — drijft de woningvraag.',
      'chartType', 'line',
      'dataSource', 'huishoudens',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'f6a7b8c9-0001-4006-8006-000000000003',
      'order', 2,
      'title', 'Woningvoorraad',
      'description', 'Totale woningvoorraad over de tijd.',
      'chartType', 'line',
      'dataSource', 'woningen',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'f6a7b8c9-0001-4006-8006-000000000004',
      'order', 3,
      'title', 'Woningtekort percentage',
      'description', 'Kernindicator voor woonbeleid: het verschil tussen vraag (huishoudens) en aanbod (woningvoorraad), uitgedrukt als percentage.',
      'chartType', 'line',
      'dataSource', 'woningtekort',
      'dimensions', jsonb_build_array('metric'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dimensionValue', 'tekort_percentage')
    ),
    jsonb_build_object(
      'id', 'f6a7b8c9-0001-4006-8006-000000000005',
      'order', 4,
      'title', 'Bevolkingsprognose tot 2030',
      'description', 'TSA Engine prognose — drijver van de toekomstige woning- en voorzieningenvraag, met 25/75-percentiel onzekerheidsmarge.',
      'chartType', 'line',
      'dataSource', 'bevolking',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('envelope', true, 'dataOrigin', 'ruimtemeesters_prognose')
    ),
    jsonb_build_object(
      'id', 'f6a7b8c9-0001-4006-8006-000000000006',
      'order', 5,
      'title', 'Woningvoorraad per gemeente',
      'description', 'Kaartweergave — klik op een gemeente om in te zoomen.',
      'chartType', 'choropleth',
      'dataSource', 'woningen',
      'dimensions', jsonb_build_array(),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'f6a7b8c9-0001-4006-8006-000000000007',
      'order', 6,
      'title', 'Woningen naar type',
      'description', 'Eengezins versus meergezins per jaar — schuift de samenstelling van de voorraad?',
      'chartType', 'stacked-bar',
      'dataSource', 'woningen',
      'dimensions', jsonb_build_array('dwelling_type'),
      'defaultGeoLevel', 'gemeente',
      'config', '{}'::jsonb
    ),
    jsonb_build_object(
      'id', 'f6a7b8c9-0001-4006-8006-000000000008',
      'order', 7,
      'title', 'Nieuwbouw 2024',
      'description', 'Aantal nieuwgebouwde woningen in het laatste jaar — momentum-indicator voor de bouwopgave.',
      'chartType', 'bar',
      'dataSource', 'woningtekort',
      'dimensions', jsonb_build_array('metric'),
      'defaultGeoLevel', 'gemeente',
      'config', jsonb_build_object('dimensionValue', 'nieuwbouw')
    )
  ),
  layout = jsonb_build_array(
    jsonb_build_object('i', 'f6a7b8c9-0001-4006-8006-000000000001', 'x', 0, 'y',  0, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'f6a7b8c9-0001-4006-8006-000000000002', 'x', 6, 'y',  0, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'f6a7b8c9-0001-4006-8006-000000000003', 'x', 0, 'y',  4, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'f6a7b8c9-0001-4006-8006-000000000004', 'x', 6, 'y',  4, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'f6a7b8c9-0001-4006-8006-000000000005', 'x', 0, 'y',  8, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'f6a7b8c9-0001-4006-8006-000000000006', 'x', 6, 'y',  8, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'f6a7b8c9-0001-4006-8006-000000000007', 'x', 0, 'y', 12, 'w', 6, 'h', 4),
    jsonb_build_object('i', 'f6a7b8c9-0001-4006-8006-000000000008', 'x', 6, 'y', 12, 'w', 6, 'h', 4)
  ),
  updated_at = NOW(),
  version = version + 1
WHERE theme_slug = 'overzicht';
