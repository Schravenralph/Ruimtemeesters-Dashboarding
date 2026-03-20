import { query } from '../db/pool.js';

/**
 * Data backup utilities.
 * Provides methods to create data snapshots and restore points.
 * In production, use pg_dump for full database backups.
 */

interface BackupInfo {
  source: string;
  rowCount: number;
  dateRange: { min: number; max: number };
  geoAreaCount: number;
  createdAt: string;
}

const DATA_TABLES = [
  'data_bevolking',
  'data_huishoudens',
  'data_woningen',
  'data_woningtekort',
];

/**
 * Get current data snapshot info.
 * Returns row counts and date ranges for each data table.
 */
export async function getDataSnapshot(): Promise<BackupInfo[]> {
  const results: BackupInfo[] = [];

  for (const table of DATA_TABLES) {
    const source = table.replace('data_', '');

    const [countResult, rangeResult, geoResult] = await Promise.all([
      query(`SELECT COUNT(*) as count FROM ${table}`),
      query(`SELECT COALESCE(MIN(year), 0) as min_year, COALESCE(MAX(year), 0) as max_year FROM ${table}`),
      query(`SELECT COUNT(DISTINCT geo_code) as count FROM ${table}`),
    ]);

    results.push({
      source,
      rowCount: parseInt(countResult.rows[0].count, 10),
      dateRange: {
        min: rangeResult.rows[0].min_year,
        max: rangeResult.rows[0].max_year,
      },
      geoAreaCount: parseInt(geoResult.rows[0].count, 10),
      createdAt: new Date().toISOString(),
    });
  }

  return results;
}

/**
 * Export all data from a table as JSON (for backup purposes).
 * Streams results to avoid memory issues with large datasets.
 */
export async function exportTableData(source: string): Promise<{
  data: Record<string, unknown>[];
  metadata: BackupInfo;
}> {
  const table = `data_${source}`;
  if (!DATA_TABLES.includes(table)) {
    throw new Error(`Unknown data source: ${source}`);
  }

  const result = await query(`SELECT * FROM ${table} ORDER BY year, geo_code`);

  const [countResult, rangeResult, geoResult] = await Promise.all([
    query(`SELECT COUNT(*) as count FROM ${table}`),
    query(`SELECT MIN(year) as min_year, MAX(year) as max_year FROM ${table}`),
    query(`SELECT COUNT(DISTINCT geo_code) as count FROM ${table}`),
  ]);

  return {
    data: result.rows,
    metadata: {
      source,
      rowCount: parseInt(countResult.rows[0].count, 10),
      dateRange: {
        min: rangeResult.rows[0].min_year,
        max: rangeResult.rows[0].max_year,
      },
      geoAreaCount: parseInt(geoResult.rows[0].count, 10),
      createdAt: new Date().toISOString(),
    },
  };
}

/**
 * Get database size information.
 */
export async function getDatabaseSize(): Promise<{
  totalSize: string;
  tables: { name: string; size: string; rowCount: number }[];
}> {
  const sizeResult = await query(
    `SELECT pg_size_pretty(pg_database_size(current_database())) as total_size`,
  );

  const tableResults = await Promise.all(
    [...DATA_TABLES, 'geo_areas', 'users', 'themes', 'tiles', 'custom_dashboards', 'access_policies', 'audit_log'].map(async table => {
      try {
        const [sizeRes, countRes] = await Promise.all([
          query(`SELECT pg_size_pretty(pg_total_relation_size('${table}')) as size`),
          query(`SELECT COUNT(*) as count FROM ${table}`),
        ]);
        return {
          name: table,
          size: sizeRes.rows[0].size,
          rowCount: parseInt(countRes.rows[0].count, 10),
        };
      } catch {
        return { name: table, size: 'N/A', rowCount: 0 };
      }
    }),
  );

  return {
    totalSize: sizeResult.rows[0].total_size,
    tables: tableResults.sort((a, b) => b.rowCount - a.rowCount),
  };
}
