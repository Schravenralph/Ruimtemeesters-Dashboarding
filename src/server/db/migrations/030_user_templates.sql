-- ADR-005: user-templates are a first-class concept distinct from system
-- theme templates (dashboard_templates) and personal dashboards
-- (custom_dashboards). See docs/adr/ADR-005-user-templates-carve-out.md.
--
-- Per EPIC #107 children #93-#96, the endpoints + UI follow in separate PRs.
-- This migration ships the schema only.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_template_visibility') THEN
    CREATE TYPE user_template_visibility AS ENUM ('private', 'org', 'public');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS user_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              VARCHAR(255) NOT NULL,
  description       TEXT,
  source_theme_slug VARCHAR(255) REFERENCES themes(slug),
  tiles             JSONB NOT NULL DEFAULT '[]'::jsonb,
  layout            JSONB NOT NULL DEFAULT '[]'::jsonb,
  visibility        user_template_visibility NOT NULL DEFAULT 'private',
  version           INT NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hot paths: "Mijn" tab in the new-project wizard queries by user_id.
CREATE INDEX IF NOT EXISTS idx_user_templates_user ON user_templates(user_id);

-- "Org" tab queries by (organization_id, visibility = 'org' OR 'public' within own org).
CREATE INDEX IF NOT EXISTS idx_user_templates_org_visibility
  ON user_templates(organization_id, visibility)
  WHERE visibility IN ('org', 'public');

-- "Publiek" tab queries by visibility = 'public' across orgs.
CREATE INDEX IF NOT EXISTS idx_user_templates_public
  ON user_templates(visibility)
  WHERE visibility = 'public';

-- updated_at auto-bump trigger
CREATE OR REPLACE FUNCTION user_templates_touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_templates_touch_updated_at ON user_templates;
CREATE TRIGGER user_templates_touch_updated_at
  BEFORE UPDATE ON user_templates
  FOR EACH ROW EXECUTE FUNCTION user_templates_touch_updated_at();
