-- Issue #96 (EPIC #107). Promotion lineage on dashboard_templates so a
-- user_templates row promoted to system-wide visibility retains a link
-- back to its source + an attribution trail.
--
-- Per ADR-005 (user templates carve-out): system templates may be
-- created either by the seed flow (migration 027, theme-derived) or by
-- the admin promotion flow (issue #96, this migration). The former has
-- source_user_template_id NULL — that's the discriminator.

ALTER TABLE dashboard_templates
  ADD COLUMN IF NOT EXISTS source_user_template_id UUID
    REFERENCES user_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promoted_by_user_id UUID
    REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promoted_at TIMESTAMPTZ;

-- Promoted-only lookups (admin UI lists rows where this is not null).
CREATE INDEX IF NOT EXISTS idx_dashboard_templates_promoted_at
  ON dashboard_templates(promoted_at DESC)
  WHERE promoted_at IS NOT NULL;
