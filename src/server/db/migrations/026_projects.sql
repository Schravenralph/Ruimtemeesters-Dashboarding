-- SPEC-D: Project entity (many-per-org) and project-scoped dashboards.
-- Implements ADR-004. See docs/superpowers/specs/2026-05-09-projects-bootstrap-design.md
--
-- A "project" is an org's named workspace bound to one theme at creation. Picking
-- a theme auto-subscribes the org to the theme's data sources (via existing
-- data_source_subscriptions) and clones the theme's tiles + layout into
-- project_dashboards.
--
-- Sync schedules remain GLOBAL (no per-project sync) per the data-pull rule
-- (memory: project_data_pull_vs_view.md).

CREATE TABLE IF NOT EXISTS projects (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name               VARCHAR(255) NOT NULL,
  slug               VARCHAR(255) NOT NULL,
  theme_slug         VARCHAR(255) NOT NULL REFERENCES themes(slug),
  default_geo_code   VARCHAR(50)  REFERENCES geo_areas(code),
  config             JSONB        NOT NULL DEFAULT '{}'::jsonb,
  created_by         UUID         REFERENCES users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  archived_at        TIMESTAMPTZ,
  UNIQUE (organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_theme ON projects(theme_slug);

CREATE TABLE IF NOT EXISTS project_dashboards (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id               UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_theme_slug        VARCHAR(255) NOT NULL,
  source_template_id       UUID         REFERENCES dashboard_templates(id),
  source_template_version  INT          NOT NULL DEFAULT 1,
  name                     VARCHAR(255) NOT NULL,
  slug                     VARCHAR(255) NOT NULL,
  layout                   JSONB        NOT NULL DEFAULT '[]'::jsonb,
  tiles                    JSONB        NOT NULL DEFAULT '[]'::jsonb,
  is_default               BOOLEAN      NOT NULL DEFAULT false,
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_project_dashboards_project ON project_dashboards(project_id);

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- dashboard_templates is repurposed as the source-of-truth for "what to clone into a new project's dashboards".
ALTER TABLE dashboard_templates ADD COLUMN IF NOT EXISTS theme_slug VARCHAR(255) REFERENCES themes(slug);
ALTER TABLE dashboard_templates ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE dashboard_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_dashboard_templates_theme ON dashboard_templates(theme_slug);
