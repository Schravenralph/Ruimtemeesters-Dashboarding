import { query } from '../db/pool.js';

/**
 * Track user view history for "recently viewed" functionality.
 */
export async function trackView(options: {
  userId: string;
  themeSlug?: string;
  dashboardId?: string;
  geoCode?: string;
}): Promise<void> {
  await query(
    `INSERT INTO view_history (user_id, theme_slug, dashboard_id, geo_code)
     VALUES ($1, $2, $3, $4)`,
    [options.userId, options.themeSlug || null, options.dashboardId || null, options.geoCode || null],
  );

  // Keep only last 100 entries per user
  await query(
    `DELETE FROM view_history WHERE user_id = $1
     AND id NOT IN (
       SELECT id FROM view_history WHERE user_id = $1 ORDER BY viewed_at DESC LIMIT 100
     )`,
    [options.userId],
  );
}

export async function getRecentViews(userId: string, limit: number = 10): Promise<{
  themeSlug: string | null;
  dashboardId: string | null;
  geoCode: string | null;
  viewedAt: string;
}[]> {
  const result = await query(
    `SELECT DISTINCT ON (COALESCE(theme_slug, dashboard_id::text, geo_code))
       theme_slug, dashboard_id, geo_code, viewed_at
     FROM view_history
     WHERE user_id = $1
     ORDER BY COALESCE(theme_slug, dashboard_id::text, geo_code), viewed_at DESC
     LIMIT $2`,
    [userId, limit],
  );

  return result.rows.map(r => ({
    themeSlug: r.theme_slug,
    dashboardId: r.dashboard_id,
    geoCode: r.geo_code,
    viewedAt: r.viewed_at,
  }));
}
