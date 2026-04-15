import { query } from '../db/pool.js';

/**
 * Aggregates data from municipality level up to province/COROP/national levels.
 * This mirrors how Primos provides aggregated views at different geographic levels.
 */

const DATA_TABLES = [
  { name: 'data_bevolking', dims: ['age_group', 'gender'] },
  { name: 'data_huishoudens', dims: ['household_type'] },
  { name: 'data_woningen', dims: ['tenure_type', 'dwelling_type'] },
  { name: 'data_woningtekort', dims: ['metric'] },
];

export async function aggregateToLevel(targetLevel: 'provincie' | 'corop' | 'land'): Promise<{
  table: string;
  inserted: number;
}[]> {
  const results: { table: string; inserted: number }[] = [];

  for (const table of DATA_TABLES) {
    const dimColumns = table.dims.join(', ');
    const dimGroupBy = table.dims.length > 0 ? `, ${dimColumns}` : '';

    // Determine the join path based on target level
    let joinClause: string;
    let targetCodeExpr: string;

    if (targetLevel === 'provincie') {
      // Municipality → Province
      joinClause = `JOIN geo_areas g ON g.code = d.geo_code AND g.level = 'gemeente'`;
      targetCodeExpr = 'g.parent_code';
    } else if (targetLevel === 'corop') {
      // Municipality → COROP (via province parent matching)
      joinClause = `JOIN geo_areas g ON g.code = d.geo_code AND g.level = 'gemeente'
                    JOIN geo_areas c ON c.level = 'corop' AND c.parent_code = g.parent_code`;
      targetCodeExpr = 'c.code';
    } else {
      // Municipality → National
      joinClause = `JOIN geo_areas g ON g.code = d.geo_code AND g.level = 'gemeente'`;
      targetCodeExpr = "'NL'";
    }

    // Build unique constraint columns for upsert
    const uniqueCols = ['geo_code', 'year', ...table.dims].join(', ');
    const onConflict = `ON CONFLICT (${uniqueCols}) DO UPDATE SET value = EXCLUDED.value`;

    // Only aggregate cbs_actuals to avoid double-counting from prognose sources.
    // The source column must be included in the unique constraint for upsert to work.
    const sql = `
      INSERT INTO ${table.name} (geo_code, year${dimGroupBy}, value, source)
      SELECT ${targetCodeExpr} as geo_code, d.year${dimGroupBy}, SUM(d.value) as value, 'cbs_actuals' as source
      FROM ${table.name} d
      ${joinClause}
      WHERE d.source = 'cbs_actuals'
      GROUP BY ${targetCodeExpr}, d.year${dimGroupBy}
      ON CONFLICT (${uniqueCols}, source) DO UPDATE SET value = EXCLUDED.value
    `;

    try {
      const result = await query(sql);
      results.push({ table: table.name, inserted: result.rowCount || 0 });
    } catch (err) {
      console.error(`Aggregation failed for ${table.name} to ${targetLevel}:`, err);
      results.push({ table: table.name, inserted: 0 });
    }
  }

  return results;
}

/**
 * Run aggregation for all levels.
 * Should be called after data import or seed.
 */
export async function runFullAggregation() {
  console.log('Running full data aggregation...');

  const provResults = await aggregateToLevel('provincie');
  console.log('Province aggregation:', provResults);

  const nationalResults = await aggregateToLevel('land');
  console.log('National aggregation:', nationalResults);

  return { province: provResults, national: nationalResults };
}
