import { query } from '../db/pool.js';

interface QualityMetric {
  source: string;
  completeness: number; // 0-100%
  yearCoverage: number[];
  geoCoverage: number;
  nullValues: number;
  lastUpdated: string | null;
}

const DATA_TABLES: Record<string, { table: string; nullableColumns: string[] }> = {
  bevolking: { table: 'data_bevolking', nullableColumns: ['age_group', 'gender'] },
  huishoudens: { table: 'data_huishoudens', nullableColumns: ['household_type'] },
  woningen: { table: 'data_woningen', nullableColumns: ['tenure_type', 'dwelling_type'] },
  woningtekort: { table: 'data_woningtekort', nullableColumns: ['metric'] },
};

export async function getDataQuality(source: string): Promise<QualityMetric | null> {
  const config = DATA_TABLES[source];
  if (!config) return null;

  const [totalResult, yearResult, geoResult] = await Promise.all([
    query(`SELECT COUNT(*) as total FROM ${config.table}`),
    query(`SELECT DISTINCT year FROM ${config.table} ORDER BY year`),
    query(`SELECT COUNT(DISTINCT geo_code) as count FROM ${config.table}`),
  ]);

  const totalRows = parseInt(totalResult.rows[0].total, 10);
  const years = yearResult.rows.map(r => r.year as number);
  const geoCount = parseInt(geoResult.rows[0].count, 10);

  // Check for null values in nullable columns
  let nullCount = 0;
  for (const col of config.nullableColumns) {
    const nullResult = await query(
      `SELECT COUNT(*) as count FROM ${config.table} WHERE ${col} IS NULL`,
    );
    nullCount += parseInt(nullResult.rows[0].count, 10);
  }

  // Calculate completeness: ratio of non-null entries to expected entries
  const expectedDimensionEntries = totalRows * config.nullableColumns.length;
  const completeness = expectedDimensionEntries > 0
    ? Math.round(((expectedDimensionEntries - nullCount) / expectedDimensionEntries) * 100)
    : 100;

  return {
    source,
    completeness,
    yearCoverage: years,
    geoCoverage: geoCount,
    nullValues: nullCount,
    lastUpdated: null, // Would come from import tracking in production
  };
}

export async function getAllDataQuality(): Promise<QualityMetric[]> {
  const results: QualityMetric[] = [];
  for (const source of Object.keys(DATA_TABLES)) {
    const metric = await getDataQuality(source);
    if (metric) results.push(metric);
  }
  return results;
}
