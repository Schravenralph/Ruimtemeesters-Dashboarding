import type { Request, Response } from 'express';
import { query, pool } from '../db/pool.js';

export async function detailedHealth(_req: Request, res: Response): Promise<void> {
  const checks: Record<string, { status: string; details?: string; latency?: number }> = {};

  // Database check
  const dbStart = Date.now();
  try {
    await query('SELECT 1');
    checks.database = { status: 'healthy', latency: Date.now() - dbStart };
  } catch (err) {
    checks.database = { status: 'unhealthy', details: err instanceof Error ? err.message : 'Unknown error' };
  }

  // Pool stats
  checks.pool = {
    status: 'healthy',
    details: `total=${pool.totalCount} idle=${pool.idleCount} waiting=${pool.waitingCount}`,
  };

  // Data tables check
  try {
    const tables = ['data_bevolking', 'data_huishoudens', 'data_woningen', 'data_woningtekort'];
    for (const table of tables) {
      const result = await query(`SELECT COUNT(*) as count FROM ${table}`);
      checks[`data_${table.replace('data_', '')}`] = {
        status: parseInt(result.rows[0].count) > 0 ? 'healthy' : 'warning',
        details: `${result.rows[0].count} rows`,
      };
    }
  } catch {
    checks.data = { status: 'unhealthy', details: 'Could not query data tables' };
  }

  // Geo areas check
  try {
    const result = await query('SELECT COUNT(*) as count FROM geo_areas');
    checks.geo_areas = {
      status: parseInt(result.rows[0].count) > 0 ? 'healthy' : 'warning',
      details: `${result.rows[0].count} areas`,
    };
  } catch {
    checks.geo_areas = { status: 'unhealthy' };
  }

  // Memory usage
  const memUsage = process.memoryUsage();
  checks.memory = {
    status: memUsage.heapUsed / memUsage.heapTotal < 0.9 ? 'healthy' : 'warning',
    details: `heap=${Math.round(memUsage.heapUsed / 1024 / 1024)}MB/${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
  };

  // Uptime
  checks.uptime = {
    status: 'healthy',
    details: `${Math.round(process.uptime())}s`,
  };

  const overallStatus = Object.values(checks).every(c => c.status === 'healthy')
    ? 'healthy'
    : Object.values(checks).some(c => c.status === 'unhealthy')
      ? 'unhealthy'
      : 'degraded';

  res.status(overallStatus === 'unhealthy' ? 503 : 200).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    checks,
  });
}
