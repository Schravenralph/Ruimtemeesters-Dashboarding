import type { Request, Response } from 'express';
import { query } from '../db/pool.js';

const DATA_TABLES = ['data_bevolking', 'data_huishoudens', 'data_woningen', 'data_woningtekort'];

export async function getDataSourceStats(_req: Request, res: Response): Promise<void> {
  const stats = await Promise.all(
    DATA_TABLES.map(async table => {
      const source = table.replace('data_', '');

      const [countResult, yearResult, geoResult] = await Promise.all([
        query(`SELECT COUNT(*) as count FROM ${table}`),
        query(`SELECT MIN(year) as min_year, MAX(year) as max_year FROM ${table}`),
        query(`SELECT COUNT(DISTINCT geo_code) as geo_count FROM ${table}`),
      ]);

      return {
        source,
        table,
        rowCount: parseInt(countResult.rows[0].count, 10),
        minYear: yearResult.rows[0].min_year,
        maxYear: yearResult.rows[0].max_year,
        geoCount: parseInt(geoResult.rows[0].geo_count, 10),
      };
    }),
  );

  // Also get geo area counts
  const geoStats = await query(
    `SELECT level, COUNT(*) as count FROM geo_areas GROUP BY level ORDER BY level`,
  );

  res.json({
    dataSources: stats,
    geoAreas: geoStats.rows.map(r => ({ level: r.level, count: parseInt(r.count, 10) })),
  });
}
