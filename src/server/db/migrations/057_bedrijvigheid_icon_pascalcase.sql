-- Migration 057: PascalCase the bedrijvigheid theme icon
--
-- Bugbot finding on PR #174: the iconMap in Sidebar.tsx uses
-- PascalCase keys ('Briefcase', 'Users', ...). Migration 056 seeded
-- 'briefcase' (lowercase), which the iconMap doesn't match — sidebar
-- fell back to LayoutDashboard for the Bedrijvigheid theme.
--
-- 056 has been corrected for fresh-DB applies; this migration repairs
-- the already-applied state on existing databases. Idempotent.

UPDATE themes
   SET icon = 'Briefcase'
 WHERE slug = 'bedrijvigheid'
   AND icon = 'briefcase';
