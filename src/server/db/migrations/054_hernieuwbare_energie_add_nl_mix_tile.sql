-- Migration 054: append NL-mix tile to hernieuwbare-energie template gallery (#158 step 2)
--
-- Adds the NL-mix tile to the dashboard_templates row used by the
-- template gallery. The dashboard page itself reads from the `tiles`
-- table — that path is handled by 055.
--
-- Follow-up to 052/053. The hernieuwbare-energie template gallery is
-- zonne-only on the gemeente-level data, which leaves the
-- wind/biomassa/biogas/waterkracht narrative invisible. This appends a
-- 6th tile that renders the new hernieuwbaar_nl source at NL level —
-- one line per energiebron, capaciteit (MW), 1990-2025.
--
-- The wind, wind_op_land and wind_op_zee values overlap in the data
-- (wind = wind_op_land + wind_op_zee). The tile renders all three for
-- now; a follow-up will switch to filterDimension once we add subset
-- support to tile configs.
--
-- EPIC: #158

UPDATE dashboard_templates
SET
  tiles = tiles || jsonb_build_array(
    jsonb_build_object(
      'id', 'c3d4e5f6-0001-400d-800d-000000000006',
      'order', 5,
      'title', 'Hernieuwbare bronnen NL — capaciteit per bron',
      'description', 'Geinstalleerde MW per energiebron op landelijk niveau (CBS 82610NED). Wind, zonne, biomassa, biogas, waterkracht — de bronnen die op gemeente-niveau niet beschikbaar zijn. NB: ''wind'' is het totaal van wind_op_land + wind_op_zee.',
      'chartType', 'line',
      'dataSource', 'hernieuwbaar_nl',
      'dimensions', jsonb_build_array('energy_source'),
      'defaultGeoLevel', 'land',
      'config', jsonb_build_object()
    )
  ),
  layout = layout || jsonb_build_array(
    jsonb_build_object('i', 'c3d4e5f6-0001-400d-800d-000000000006', 'x', 0, 'y', 12, 'w', 12, 'h', 4)
  ),
  updated_at = NOW(),
  version = version + 1
WHERE theme_slug = 'hernieuwbare-energie'
  AND NOT EXISTS (
    -- Guard against re-running (idempotent on existing rows).
    SELECT 1 FROM jsonb_array_elements(tiles) elem
    WHERE elem->>'id' = 'c3d4e5f6-0001-400d-800d-000000000006'
  );
