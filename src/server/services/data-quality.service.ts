import { query } from '../db/pool.js';
import { safeIdent } from '../db/sql-utils.js';
import { getDataSources, getDataSource } from './data-source-registry.js';

interface QualityMetric {
  source: string;
  completeness: number; // 0-100%
  yearCoverage: number[];
  geoCoverage: number;
  nullValues: number;
  lastUpdated: string | null;
}

async function quality(
  key: string,
  tableName: string,
  nullableColumns: string[],
): Promise<QualityMetric> {
  const table = safeIdent(tableName);
  const [totalResult, yearResult, geoResult] = await Promise.all([
    query(`SELECT COUNT(*) as total FROM ${table}`),
    query(`SELECT DISTINCT year FROM ${table} ORDER BY year`),
    query(`SELECT COUNT(DISTINCT geo_code) as count FROM ${table}`),
  ]);

  const totalRows = parseInt(totalResult.rows[0].total, 10);
  const years = yearResult.rows.map(r => r.year as number);
  const geoCount = parseInt(geoResult.rows[0].count, 10);

  // Count null values in the registry's dimension columns
  let nullCount = 0;
  for (const col of nullableColumns) {
    const safeCol = safeIdent(col);
    const nullResult = await query(
      `SELECT COUNT(*) as count FROM ${table} WHERE ${safeCol} IS NULL`,
    );
    nullCount += parseInt(nullResult.rows[0].count, 10);
  }

  const expectedDimensionEntries = totalRows * nullableColumns.length;
  const completeness =
    expectedDimensionEntries > 0
      ? Math.round(((expectedDimensionEntries - nullCount) / expectedDimensionEntries) * 100)
      : 100;

  return {
    source: key,
    completeness,
    yearCoverage: years,
    geoCoverage: geoCount,
    nullValues: nullCount,
    lastUpdated: null, // Would come from import tracking in production
  };
}

export async function getDataQuality(source: string): Promise<QualityMetric | null> {
  const def = await getDataSource(source);
  if (!def) return null;
  return quality(def.key, def.tableName, def.dimensionColumns);
}

export async function getAllDataQuality(): Promise<QualityMetric[]> {
  const sources = await getDataSources();
  const results: QualityMetric[] = [];
  for (const def of Object.values(sources)) {
    results.push(await quality(def.key, def.tableName, def.dimensionColumns));
  }
  return results;
}
