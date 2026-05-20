-- Migration 055: add NL-mix tile to the `tiles` table (#158 step 2 — actual fix)
--
-- 054 edited the dashboard_templates row (template gallery), but the
-- live theme page at /dashboard/<slug> reads from the `tiles` table,
-- not dashboard_templates. This adds the same NL-mix tile to `tiles`
-- so the new hernieuwbaar_nl source is visible on the page that
-- gemeente-officials actually open.
--
-- (Yes, two tile stores. ADR-005 acknowledged the duplication; merging
-- them is on the backlog. For #158 we update both surfaces and move on.)
--
-- EPIC: #158

INSERT INTO tiles (theme_id, title, chart_type, data_source, dimensions, default_geo_level, description, "order", config)
SELECT
  th.id,
  'Hernieuwbare bronnen NL — capaciteit per bron',
  'line',
  'hernieuwbaar_nl',
  ARRAY['energy_source'],
  'land',
  'Geinstalleerde MW per energiebron op landelijk niveau (CBS 82610NED). Wind, zonne, biomassa, biogas, waterkracht — de bronnen die op gemeente-niveau niet beschikbaar zijn. NB: ''wind'' is het totaal van wind_op_land + wind_op_zee.',
  COALESCE((SELECT MAX("order") + 1 FROM tiles WHERE theme_id = th.id), 0),
  '{}'::jsonb
FROM themes th
WHERE th.slug = 'hernieuwbare-energie'
  AND NOT EXISTS (
    SELECT 1 FROM tiles t2
    WHERE t2.theme_id = th.id
      AND t2.title = 'Hernieuwbare bronnen NL — capaciteit per bron'
  );
