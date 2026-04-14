-- Migration 015: Add CBS sync configs for sustainability data sources
-- Note: emissies uses CBS 84978NED (CO2 per sector per gemeente)

UPDATE data_sources SET cbs_table_id = '84978NED', sync_config = '{
  "cbsTable": "84978NED",
  "targetTable": "data_emissies",
  "filter": "",
  "measureCode": "CO2_1",
  "dimensionMappings": [
    {"cbsDimension": "Sectoren", "targetColumn": "sector", "valueMap": {
      "T001081": "totaal",
      "BEX009300": "industrie",
      "BEX009400": "energie",
      "BEX009500": "verkeer",
      "BEX009600": "landbouw",
      "BEX009700": "gebouwde-omgeving",
      "BEX009800": "overig"
    }},
    {"cbsDimension": "BronnenKlimaatverandering", "targetColumn": "emission_type", "valueMap": {
      "T001246": "co2"
    }}
  ]
}'::jsonb WHERE key = 'emissies';

UPDATE data_sources SET sync_config = '{
  "cbsTable": "83867NED",
  "targetTable": "data_energie",
  "filter": "",
  "measureCode": "TotaalEindverbruik_1",
  "dimensionMappings": [
    {"cbsDimension": "Energiedragers", "targetColumn": "fuel_type", "valueMap": {
      "T001150": "totaal",
      "A045110": "aardgas",
      "A045130": "elektriciteit",
      "A045140": "warmte",
      "A045150": "overig"
    }},
    {"cbsDimension": "SBI2008", "targetColumn": "sector", "valueMap": {
      "T001081": "totaal"
    }}
  ]
}'::jsonb WHERE key = 'energie';

UPDATE data_sources SET sync_config = '{
  "cbsTable": "84518NED",
  "targetTable": "data_hernieuwbaar",
  "filter": "",
  "measureCode": "OpgesteldVermogen_1",
  "dimensionMappings": [
    {"cbsDimension": "Energiebronnen", "targetColumn": "energy_source", "valueMap": {
      "T001320": "totaal",
      "A047104": "zonnestroom"
    }},
    {"cbsDimension": "Kenmerken", "targetColumn": "metric", "valueMap": {
      "T001108": "vermogen"
    }}
  ]
}'::jsonb WHERE key = 'hernieuwbaar';

UPDATE data_sources SET sync_config = '{
  "cbsTable": "83452NED",
  "targetTable": "data_afval",
  "filter": "",
  "measureCode": "TotaalAangeboden_1",
  "dimensionMappings": [
    {"cbsDimension": "Afvalsoorten", "targetColumn": "waste_type", "valueMap": {
      "T001126": "totaal",
      "A045210": "huishoudelijk",
      "A045220": "gft",
      "A045230": "papier",
      "A045240": "glas",
      "A045250": "textiel",
      "A045260": "kunststof",
      "A045270": "restafval"
    }},
    {"cbsDimension": "Verwerking", "targetColumn": "metric", "valueMap": {
      "T001081": "totaal"
    }}
  ]
}'::jsonb WHERE key = 'afval';
