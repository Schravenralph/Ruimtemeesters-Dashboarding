/**
 * forge-2026-05-12-004 (cycle 4): theme readiness admin view.
 *
 * One row per system theme answering "is this theme shipped per ADR-002?":
 *   tiles seeded + kpi_config populated + dashboard_templates row exists +
 *   at least one data_source referenced.
 *
 * The `isThemeShipped` helper is exported for unit testing the rule.
 */

import type { Request, Response } from 'express';
import { query } from '../db/pool.js';

export interface ThemeReadinessEntry {
  slug: string;
  name: string;
  supercategory: string | null;
  tileCount: number;
  kpiConfigCount: number;
  templateSeeded: boolean;
  templateVersion: number | null;
  distinctDataSources: string[];
  shipped: boolean;
}

export function isThemeShipped(
  entry: Omit<ThemeReadinessEntry, 'shipped'>,
): boolean {
  return entry.tileCount > 0
    && entry.templateSeeded
    && entry.kpiConfigCount > 0
    && entry.distinctDataSources.length > 0;
}

export async function getThemeReadiness(_req: Request, res: Response): Promise<void> {
  const result = await query<{
    slug: string;
    name: string;
    supercategory: string | null;
    tile_count: string;
    kpi_config_count: string;
    template_seeded: boolean;
    template_version: number | null;
    distinct_data_sources: string[] | null;
  }>(
    `SELECT
       t.slug,
       t.name,
       t.supercategory,
       (SELECT COUNT(*) FROM tiles WHERE theme_id = t.id)::text AS tile_count,
       jsonb_array_length(COALESCE(t.kpi_config, '[]'::jsonb))::text AS kpi_config_count,
       EXISTS (SELECT 1 FROM dashboard_templates dt WHERE dt.theme_slug = t.slug) AS template_seeded,
       (SELECT MAX(version) FROM dashboard_templates WHERE theme_slug = t.slug) AS template_version,
       (SELECT array_agg(DISTINCT data_source ORDER BY data_source)
        FROM tiles WHERE theme_id = t.id) AS distinct_data_sources
     FROM themes t
     WHERE t.is_system = true
     ORDER BY COALESCE(t.supercategory, 'zzz'), t."order", t.slug`,
  );

  const themes: ThemeReadinessEntry[] = result.rows.map(r => {
    const base: Omit<ThemeReadinessEntry, 'shipped'> = {
      slug: r.slug,
      name: r.name,
      supercategory: r.supercategory,
      tileCount: Number(r.tile_count),
      kpiConfigCount: Number(r.kpi_config_count),
      templateSeeded: r.template_seeded,
      templateVersion: r.template_version,
      distinctDataSources: r.distinct_data_sources ?? [],
    };
    return { ...base, shipped: isThemeShipped(base) };
  });

  res.json({ themes });
}
