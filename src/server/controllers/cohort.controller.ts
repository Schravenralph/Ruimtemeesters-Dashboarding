import type { Request, Response } from 'express';
import { query } from '../db/pool.js';

/**
 * GET /api/cohorts/:gemeenteCode
 *
 * Returns the focal gemeente's memberships across every cohort_type, with
 * provenance + member-list per membership, plus a per-theme default cohort_type
 * map (so the client knows which cohort type to default to per supercategory).
 *
 * Implements ADR-003 §"Cohort definitions" via SPEC docs/superpowers/specs/2026-05-09-cohort-referential-data-design.md
 */
export async function getCohortMemberships(req: Request, res: Response): Promise<void> {
  const gemeenteCode = req.params.gemeenteCode;
  if (!gemeenteCode || typeof gemeenteCode !== 'string' || !/^[A-Z]{2}\d+$/.test(gemeenteCode)) {
    res.status(400).json({ error: 'Invalid gemeenteCode format' });
    return;
  }

  // Memberships of the focal + all members per cohort, in one round-trip.
  const rows = await query<{
    cohort_type: string;
    cohort_key: string;
    name: string;
    description: string | null;
    source: string;
    source_url: string | null;
    source_vintage: string;
    members: string[];
  }>(
    `
    WITH focal AS (
      SELECT cohort_type, cohort_key
      FROM cohort_members
      WHERE geo_code = $1
    )
    SELECT
      d.cohort_type,
      d.cohort_key,
      d.name,
      d.description,
      d.source,
      d.source_url,
      d.source_vintage::TEXT AS source_vintage,
      ARRAY(
        SELECT m.geo_code
        FROM cohort_members m
        WHERE m.cohort_type = d.cohort_type AND m.cohort_key = d.cohort_key
        ORDER BY m.geo_code
      ) AS members
    FROM cohort_definitions d
    JOIN focal f ON f.cohort_type = d.cohort_type AND f.cohort_key = d.cohort_key
    ORDER BY d.cohort_type, d.sort_order
    `,
    [gemeenteCode],
  );

  if (rows.rowCount === 0) {
    res.status(404).json({ error: `No cohort memberships for ${gemeenteCode}` });
    return;
  }

  // Per-theme default cohort_type lives on themes.default_cohort_type
  // (migration 029, ADR-003). Single source of truth per theme.
  const defaultRows = await query<{ slug: string; default_cohort_type: string }>(
    `SELECT slug, default_cohort_type FROM themes WHERE is_system = true`,
  );
  const defaultByTheme: Record<string, string> = {};
  for (const r of defaultRows.rows) {
    defaultByTheme[r.slug] = r.default_cohort_type;
  }

  res.json({
    geoCode: gemeenteCode,
    memberships: rows.rows.map(r => ({
      cohortType: r.cohort_type,
      cohortKey: r.cohort_key,
      name: r.name,
      description: r.description,
      source: r.source,
      sourceUrl: r.source_url,
      sourceVintage: r.source_vintage,
      members: r.members,
      memberCount: r.members.length,
    })),
    defaultByTheme,
  });
}
