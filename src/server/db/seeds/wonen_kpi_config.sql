UPDATE themes SET kpi_config = '[
  {"label": "Bevolking", "dataSource": "bevolking", "format": "compact", "deltaDirection": "neutral"},
  {"label": "Huishoudens", "dataSource": "huishoudens", "format": "compact", "deltaDirection": "neutral"},
  {"label": "Woningvoorraad", "dataSource": "woningen", "format": "compact", "deltaDirection": "neutral"},
  {"label": "Woningtekort", "dataSource": "woningtekort", "format": "compact", "deltaDirection": "higher-is-bad"}
]'::jsonb WHERE slug = 'overzicht' AND supercategory = 'wonen';

UPDATE themes SET kpi_config = '[
  {"label": "Bevolking totaal", "dataSource": "bevolking", "format": "compact", "deltaDirection": "neutral"},
  {"label": "0-14 jaar", "dataSource": "bevolking", "dimension": "age_group", "dimensionValue": "0-14", "format": "compact", "deltaDirection": "neutral"},
  {"label": "65+ jaar", "dataSource": "bevolking", "dimension": "age_group", "dimensionValue": "65-74", "format": "compact", "deltaDirection": "neutral"}
]'::jsonb WHERE slug = 'bevolking' AND supercategory = 'wonen';

UPDATE themes SET kpi_config = '[
  {"label": "Huishoudens totaal", "dataSource": "huishoudens", "format": "compact", "deltaDirection": "neutral"}
]'::jsonb WHERE slug = 'huishoudens' AND supercategory = 'wonen';

UPDATE themes SET kpi_config = '[
  {"label": "Woningvoorraad totaal", "dataSource": "woningen", "format": "compact", "deltaDirection": "neutral"}
]'::jsonb WHERE slug = 'woningen' AND supercategory = 'wonen';

UPDATE themes SET kpi_config = '[
  {"label": "Woningtekort", "dataSource": "woningtekort", "format": "compact", "deltaDirection": "higher-is-bad"}
]'::jsonb WHERE slug = 'woningtekort' AND supercategory = 'wonen';
