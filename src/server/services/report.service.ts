import { query } from '../db/pool.js';

interface ReportConfig {
  source: string;
  geoCode: string;
  year: number;
  includeComparison?: boolean;
  compareYear?: number;
}

interface ReportSection {
  title: string;
  data: { label: string; value: number; change?: number }[];
}

/**
 * Generate a structured report for a data source.
 * Can be used for scheduled PDF generation or API responses.
 */
export async function generateReport(config: ReportConfig): Promise<{
  title: string;
  generatedAt: string;
  geoCode: string;
  year: number;
  sections: ReportSection[];
}> {
  const tableMap: Record<string, { table: string; dimCol: string }> = {
    bevolking: { table: 'data_bevolking', dimCol: 'age_group' },
    huishoudens: { table: 'data_huishoudens', dimCol: 'household_type' },
    woningen: { table: 'data_woningen', dimCol: 'tenure_type' },
    woningtekort: { table: 'data_woningtekort', dimCol: 'metric' },
  };

  const tableConfig = tableMap[config.source];
  if (!tableConfig) throw new Error(`Unknown source: ${config.source}`);

  // Get current year data
  const currentResult = await query(
    `SELECT ${tableConfig.dimCol} as dimension, SUM(value) as total
     FROM ${tableConfig.table}
     WHERE geo_code = $1 AND year = $2
     GROUP BY ${tableConfig.dimCol}
     ORDER BY total DESC`,
    [config.geoCode, config.year],
  );

  // Get comparison data if requested
  let compareResult = null;
  if (config.includeComparison && config.compareYear) {
    compareResult = await query(
      `SELECT ${tableConfig.dimCol} as dimension, SUM(value) as total
       FROM ${tableConfig.table}
       WHERE geo_code = $1 AND year = $2
       GROUP BY ${tableConfig.dimCol}`,
      [config.geoCode, config.compareYear],
    );
  }

  const compareMap = new Map<string, number>();
  if (compareResult) {
    for (const row of compareResult.rows) {
      compareMap.set(row.dimension, Number(row.total));
    }
  }

  // Get totals
  const totalResult = await query(
    `SELECT SUM(value) as total
     FROM ${tableConfig.table}
     WHERE geo_code = $1 AND year = $2`,
    [config.geoCode, config.year],
  );
  const grandTotal = Number(totalResult.rows[0]?.total || 0);

  let compareGrandTotal: number | undefined;
  if (config.includeComparison && config.compareYear) {
    const compareTotalResult = await query(
      `SELECT SUM(value) as total
       FROM ${tableConfig.table}
       WHERE geo_code = $1 AND year = $2`,
      [config.geoCode, config.compareYear],
    );
    const rawTotal = compareTotalResult.rows[0]?.total;
    compareGrandTotal = rawTotal != null ? Number(rawTotal) : undefined;
  }

  // Build sections
  const sections: ReportSection[] = [
    {
      title: 'Overzicht',
      data: [{
        label: 'Totaal',
        value: grandTotal,
        change: compareGrandTotal !== undefined ? grandTotal - compareGrandTotal : undefined,
      }],
    },
    {
      title: `Uitsplitsing naar ${tableConfig.dimCol.replace(/_/g, ' ')}`,
      data: currentResult.rows.map(row => ({
        label: row.dimension || 'Onbekend',
        value: Number(row.total),
        change: compareMap.has(row.dimension)
          ? Number(row.total) - compareMap.get(row.dimension)!
          : undefined,
      })),
    },
  ];

  // Get geo name
  const geoResult = await query('SELECT name FROM geo_areas WHERE code = $1', [config.geoCode]);
  const geoName = geoResult.rows[0]?.name || config.geoCode;

  return {
    title: `${config.source.charAt(0).toUpperCase() + config.source.slice(1)} - ${geoName} (${config.year})`,
    generatedAt: new Date().toISOString(),
    geoCode: config.geoCode,
    year: config.year,
    sections,
  };
}
