-- Issue #82 (EPIC #106). Seed dashboard_templates with one row per existing
-- system theme so project-bootstrap.service uses the template path (per ADR-004)
-- instead of silently running the inline fallback. Unblocks the cycle-11
-- "Update from theme" diff/apply flow (needs templates to diff against) and
-- enables real template lineage on project_dashboards.source_template_id.
--
-- Idempotent at SQL level via WHERE NOT EXISTS — safe to apply twice.

INSERT INTO dashboard_templates (
  name,
  description,
  category,
  tiles,
  layout,
  preview_config,
  is_featured,
  theme_slug,
  version
)
SELECT
  t.name,
  COALESCE(t.description, ''),
  'theme' AS category,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', tl.id,
          'title', tl.title,
          'chartType', tl.chart_type,
          'dataSource', tl.data_source,
          'dimensions', tl.dimensions,
          'defaultGeoLevel', tl.default_geo_level,
          'description', tl.description,
          'config', tl.config,
          'order', tl."order"
        ) ORDER BY tl."order"
      )
      FROM tiles tl WHERE tl.theme_id = t.id
    ),
    '[]'::jsonb
  ) AS tiles,
  COALESCE(
    (
      SELECT dl.items
      FROM dashboard_layouts dl
      WHERE dl.theme_id = t.id AND dl.user_id IS NULL
      ORDER BY dl.updated_at DESC NULLS LAST
      LIMIT 1
    ),
    '[]'::jsonb
  ) AS layout,
  '{}'::jsonb AS preview_config,
  true AS is_featured,
  t.slug AS theme_slug,
  1 AS version
FROM themes t
WHERE t.is_system = true
  AND NOT EXISTS (
    SELECT 1 FROM dashboard_templates dt WHERE dt.theme_slug = t.slug
  );
