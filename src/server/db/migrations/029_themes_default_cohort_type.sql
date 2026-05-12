-- Issue #87 (EPIC #106). Per-theme cohort default lives on the theme,
-- not in cohort_definitions.theme_default_for[] arrays (which had a
-- slug-mismatch class of bugs).
--
-- Per ADR-003: Wonen-supercategory themes default to woningmarktregio;
-- others default to populatiegrootte.

ALTER TABLE themes
  ADD COLUMN IF NOT EXISTS default_cohort_type VARCHAR(50) NOT NULL DEFAULT 'populatiegrootte';

-- Backfill Wonen → woningmarktregio.
-- True no-op idempotency via the value guard.
UPDATE themes
SET default_cohort_type = 'woningmarktregio'
WHERE supercategory = 'wonen'
  AND is_system = true
  AND default_cohort_type IS DISTINCT FROM 'woningmarktregio';
