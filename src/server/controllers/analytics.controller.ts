import type { Request, Response } from 'express';
import { query } from '../db/pool.js';

/**
 * Dashboard usage analytics for admins.
 */
export async function getDashboardAnalytics(_req: Request, res: Response): Promise<void> {
  const [
    userCountResult,
    dashboardCountResult,
    recentLoginsResult,
    topThemesResult,
    dataVolumeResult,
  ] = await Promise.all([
    query('SELECT COUNT(*) as count, role FROM users GROUP BY role ORDER BY count DESC'),
    query('SELECT COUNT(*) as count FROM custom_dashboards'),
    query(`SELECT COUNT(*) as count FROM audit_log WHERE action LIKE '%login%' AND created_at > NOW() - INTERVAL '7 days'`),
    query(`
      SELECT t.name, t.slug, COUNT(DISTINCT dl.user_id) as user_count
      FROM themes t
      LEFT JOIN dashboard_layouts dl ON dl.theme_id = t.id
      GROUP BY t.id
      ORDER BY user_count DESC
    `),
    query(`
      SELECT
        (SELECT COUNT(*) FROM data_bevolking) as bevolking,
        (SELECT COUNT(*) FROM data_huishoudens) as huishoudens,
        (SELECT COUNT(*) FROM data_woningen) as woningen,
        (SELECT COUNT(*) FROM data_woningtekort) as woningtekort
    `),
  ]);

  res.json({
    users: {
      byRole: userCountResult.rows.map(r => ({ role: r.role, count: parseInt(r.count) })),
      total: userCountResult.rows.reduce((sum, r) => sum + parseInt(r.count), 0),
    },
    dashboards: {
      customCount: parseInt(dashboardCountResult.rows[0].count),
    },
    activity: {
      loginsLast7Days: parseInt(recentLoginsResult.rows[0].count),
    },
    themes: topThemesResult.rows.map(r => ({
      name: r.name,
      slug: r.slug,
      userCount: parseInt(r.user_count),
    })),
    dataVolume: {
      bevolking: parseInt(dataVolumeResult.rows[0].bevolking),
      huishoudens: parseInt(dataVolumeResult.rows[0].huishoudens),
      woningen: parseInt(dataVolumeResult.rows[0].woningen),
      woningtekort: parseInt(dataVolumeResult.rows[0].woningtekort),
      total: ['bevolking', 'huishoudens', 'woningen', 'woningtekort']
        .reduce((sum, key) => sum + parseInt(dataVolumeResult.rows[0][key]), 0),
    },
  });
}
