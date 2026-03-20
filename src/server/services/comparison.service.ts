import { query } from '../db/pool.js';

interface ComparisonResult {
  areaCode: string;
  areaName: string;
  currentValue: number;
  previousValue: number;
  absoluteChange: number;
  percentChange: number;
  rank: number;
}

/**
 * Compare all areas within a geographic level for a given data source.
 * Returns ranked results by change rate.
 */
export async function compareAreasAtLevel(options: {
  source: string;
  level: string;
  currentYear: number;
  previousYear: number;
}): Promise<ComparisonResult[]> {
  const { source, level, currentYear, previousYear } = options;

  const tableMap: Record<string, string> = {
    bevolking: 'data_bevolking',
    huishoudens: 'data_huishoudens',
    woningen: 'data_woningen',
    woningtekort: 'data_woningtekort',
  };

  const table = tableMap[source];
  if (!table) return [];

  const sql = `
    WITH current_data AS (
      SELECT d.geo_code, g.name, SUM(d.value) as total
      FROM ${table} d
      JOIN geo_areas g ON g.code = d.geo_code AND g.level = $1
      WHERE d.year = $2
      GROUP BY d.geo_code, g.name
    ),
    previous_data AS (
      SELECT d.geo_code, SUM(d.value) as total
      FROM ${table} d
      JOIN geo_areas g ON g.code = d.geo_code AND g.level = $1
      WHERE d.year = $3
      GROUP BY d.geo_code
    )
    SELECT
      c.geo_code,
      c.name,
      c.total as current_value,
      COALESCE(p.total, 0) as previous_value
    FROM current_data c
    LEFT JOIN previous_data p ON p.geo_code = c.geo_code
    ORDER BY c.name
  `;

  const result = await query(sql, [level, currentYear, previousYear]);

  const results = result.rows.map(row => {
    const currentValue = Number(row.current_value);
    const previousValue = Number(row.previous_value);
    const absoluteChange = currentValue - previousValue;
    const percentChange = previousValue > 0 ? (absoluteChange / previousValue) * 100 : 0;

    return {
      areaCode: row.geo_code,
      areaName: row.name,
      currentValue,
      previousValue,
      absoluteChange,
      percentChange,
      rank: 0,
    };
  });

  // Rank by percent change
  results
    .sort((a, b) => b.percentChange - a.percentChange)
    .forEach((r, i) => { r.rank = i + 1; });

  return results;
}
