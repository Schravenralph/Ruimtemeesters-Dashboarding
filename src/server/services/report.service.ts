import { query } from '../db/pool.js';

// Priority: cbs_actuals > cbs_prognose > ruimtemeesters_prognose
const SOURCE_PRIORITY = `CASE source WHEN 'cbs_actuals' THEN 1 WHEN 'cbs_prognose' THEN 2 ELSE 3 END`;

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

// Per-source config: primary dimension to break down, extra filter to pin other dimensions
// to 'totaal', and the grand total filter for all dimensions.
interface SourceReportConfig {
  table: string;
  dimCol: string;
  dimFilter: string;       // Extra WHERE for breakdown (pin other dimensions to totaal)
  grandTotalFilter: string; // WHERE for grand total row
}

const SOURCE_CONFIGS: Record<string, SourceReportConfig> = {
  bevolking: {
    table: 'data_bevolking',
    dimCol: 'age_group',
    dimFilter: "AND gender = 'totaal' AND age_group != 'totaal'",
    grandTotalFilter: "AND age_group = 'totaal' AND gender = 'totaal'",
  },
  huishoudens: {
    table: 'data_huishoudens',
    dimCol: 'household_type',
    dimFilter: "AND dimension_type = 'samenstelling' AND household_type != 'totaal'",
    grandTotalFilter: "AND household_type = 'totaal' AND dimension_type = 'samenstelling'",
  },
  woningen: {
    table: 'data_woningen',
    dimCol: 'tenure_type',
    dimFilter: "AND dwelling_type = 'totaal' AND tenure_type != 'totaal'",
    grandTotalFilter: "AND tenure_type = 'totaal' AND dwelling_type = 'totaal'",
  },
  woningtekort: {
    table: 'data_woningtekort',
    dimCol: 'metric',
    dimFilter: "AND metric != 'tekort'",  // Show individual metrics, not the computed tekort
    grandTotalFilter: "AND metric = 'tekort'",
  },
};

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
  const sourceConfig = SOURCE_CONFIGS[config.source];
  if (!sourceConfig) throw new Error(`Unknown source: ${config.source}`);

  // Dimension breakdown: pin other dimensions to 'totaal', exclude subtotal row, dedup sources
  const breakdownSql = `
    WITH ranked AS (
      SELECT ${sourceConfig.dimCol} as dimension, value,
             ROW_NUMBER() OVER (PARTITION BY ${sourceConfig.dimCol} ORDER BY ${SOURCE_PRIORITY}) as rn
      FROM ${sourceConfig.table}
      WHERE geo_code = $1 AND year = $2 ${sourceConfig.dimFilter}
    )
    SELECT dimension, value as total FROM ranked WHERE rn = 1 ORDER BY total DESC`;

  const currentResult = await query(breakdownSql, [config.geoCode, config.year]);

  // Get comparison data if requested
  let compareResult = null;
  if (config.includeComparison && config.compareYear) {
    compareResult = await query(breakdownSql, [config.geoCode, config.compareYear]);
  }

  const compareMap = new Map<string, number>();
  if (compareResult) {
    for (const row of compareResult.rows) {
      compareMap.set(row.dimension, Number(row.total));
    }
  }

  // Grand total: single row with all dimensions = 'totaal', best source
  const grandTotalSql = `
    SELECT COALESCE(value, 0) as total FROM ${sourceConfig.table}
    WHERE geo_code = $1 AND year = $2 ${sourceConfig.grandTotalFilter}
    ORDER BY ${SOURCE_PRIORITY} LIMIT 1`;

  const totalResult = await query(grandTotalSql, [config.geoCode, config.year]);
  const grandTotal = Number(totalResult.rows[0]?.total ?? 0);

  let compareGrandTotal: number | undefined;
  if (config.includeComparison && config.compareYear) {
    const compareTotalResult = await query(grandTotalSql, [config.geoCode, config.compareYear]);
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
      title: `Uitsplitsing naar ${sourceConfig.dimCol.replace(/_/g, ' ')}`,
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
