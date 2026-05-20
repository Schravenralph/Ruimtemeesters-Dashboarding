-- Migration 061: fix Inkomen KPI format (#159 bugbot follow-up)
--
-- 060 set kpi_config.format='currency', but ThemeKpiEntry/NumberDisplay
-- only accept 'number'|'compact'|'percent'. The KPI rendered blank.
-- 'compact' formats EUR x 1000 as "44K" — fine for an income headline.

UPDATE themes
   SET kpi_config = jsonb_build_array(
        jsonb_build_object(
          'label', 'Gem. gestandaardiseerd inkomen',
          'dataSource', 'inkomen',
          'dimension', 'huishouden_type',
          'dimensionValue', 'totaal',
          'format', 'compact',
          'deltaDirection', 'higher-is-good'
        )
      )
 WHERE slug = 'inkomen';
