import { query } from '../db/pool.js';

// Priority: cbs_actuals > cbs_prognose > ruimtemeesters_prognose
const SOURCE_PRIORITY = `CASE d.source WHEN 'cbs_actuals' THEN 1 WHEN 'cbs_prognose' THEN 2 ELSE 3 END`;

interface ComparisonResult {
  areaCode: string;
  areaName: string;
  currentValue: number;
  previousValue: number;
  absoluteChange: number;
  percentChange: number;
  rank: number;
}

// Per-source dimension filters for grand total rows
const DIMENSION_FILTERS: Record<string, string> = {
  bevolking: "AND d.age_group = 'totaal' AND d.gender = 'totaal'",
  huishoudens: "AND d.household_type = 'totaal' AND d.dimension_type = 'samenstelling'",
  woningen: "AND d.tenure_type = 'totaal' AND d.dwelling_type = 'totaal'",
  woningtekort: "AND d.metric = 'tekort'",
};

const TABLE_MAP: Record<string, string> = {
  bevolking: 'data_bevolking',
  huishoudens: 'data_huishoudens',
  woningen: 'data_woningen',
  woningtekort: 'data_woningtekort',
};

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

  const table = TABLE_MAP[source];
  const dimFilter = DIMENSION_FILTERS[source];
  if (!table || !dimFilter) return [];

  // Filter dimensions to grand total, deduplicate overlapping sources per area+year
  const sql = `
    WITH current_ranked AS (
      SELECT d.geo_code, g.name, d.value,
             ROW_NUMBER() OVER (PARTITION BY d.geo_code ORDER BY ${SOURCE_PRIORITY}) as rn
      FROM ${table} d
      JOIN geo_areas g ON g.code = d.geo_code AND g.level = $1
      WHERE d.year = $2 ${dimFilter}
    ),
    previous_ranked AS (
      SELECT d.geo_code, d.value,
             ROW_NUMBER() OVER (PARTITION BY d.geo_code ORDER BY ${SOURCE_PRIORITY}) as rn
      FROM ${table} d
      JOIN geo_areas g ON g.code = d.geo_code AND g.level = $1
      WHERE d.year = $3 ${dimFilter}
    )
    SELECT
      c.geo_code,
      c.name,
      c.value as current_value,
      COALESCE(p.value, 0) as previous_value
    FROM current_ranked c
    LEFT JOIN previous_ranked p ON p.geo_code = c.geo_code AND p.rn = 1
    WHERE c.rn = 1
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
