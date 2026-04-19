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
  unit: string;
  totalLabel?: string;      // Override for the grand total row label (e.g. "CO2-uitstoot")
  breakdownLabel?: string;  // Override for the breakdown section title
}

const SOURCE_CONFIGS: Record<string, SourceReportConfig> = {
  bevolking: {
    table: 'data_bevolking',
    dimCol: 'age_group',
    dimFilter: "AND gender = 'totaal' AND age_group != 'totaal'",
    grandTotalFilter: "AND age_group = 'totaal' AND gender = 'totaal'",
    unit: 'personen',
  },
  huishoudens: {
    table: 'data_huishoudens',
    dimCol: 'household_type',
    dimFilter: "AND dimension_type = 'samenstelling' AND household_type != 'totaal'",
    grandTotalFilter: "AND household_type = 'totaal' AND dimension_type = 'samenstelling'",
    unit: 'huishoudens',
  },
  woningen: {
    table: 'data_woningen',
    dimCol: 'tenure_type',
    dimFilter: "AND dwelling_type = 'totaal' AND tenure_type != 'totaal'",
    grandTotalFilter: "AND tenure_type = 'totaal' AND dwelling_type = 'totaal'",
    unit: 'woningen',
  },
  woningtekort: {
    table: 'data_woningtekort',
    dimCol: 'metric',
    dimFilter: "AND metric != 'tekort'",
    grandTotalFilter: "AND metric = 'tekort'",
    unit: '%',
    totalLabel: 'Woningtekort',
  },
  energie: {
    table: 'data_energie',
    dimCol: 'fuel_type',
    dimFilter: "AND sector = 'woningen' AND fuel_type != 'totaal'",
    grandTotalFilter: "AND sector = 'woningen' AND fuel_type = 'totaal'",
    unit: 'TJ',
    totalLabel: 'Totaal energieverbruik woningen',
    breakdownLabel: 'Uitsplitsing naar brandstof',
  },
  emissies: {
    table: 'data_emissies',
    dimCol: 'emission_type',
    dimFilter: "AND sector = 'totaal' AND emission_type != 'co2'",
    grandTotalFilter: "AND sector = 'totaal' AND emission_type = 'co2'",
    unit: 'ton CO2-eq',
    totalLabel: 'CO2-uitstoot',
    breakdownLabel: 'Overige broeikasgassen',
  },
  hernieuwbaar: {
    table: 'data_hernieuwbaar',
    dimCol: 'metric',
    dimFilter: "AND energy_source = 'zonnepanelen' AND metric NOT IN ('totaal', 'aantal_installaties')",
    grandTotalFilter: "AND energy_source = 'zonnepanelen' AND metric = 'aantal_installaties'",
    unit: '',
    totalLabel: 'Zonnepanelen (installaties)',
    breakdownLabel: 'Overige indicatoren',
  },
  afval: {
    table: 'data_afval',
    dimCol: 'waste_type',
    dimFilter: "AND metric = 'kg_per_inwoner' AND waste_type != 'totaal'",
    grandTotalFilter: "AND metric = 'kg_per_inwoner' AND waste_type = 'totaal'",
    unit: 'kg per inwoner',
    totalLabel: 'Totaal huishoudelijk afval',
    breakdownLabel: 'Uitsplitsing naar afvalsoort',
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
  unit: string;
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
        label: sourceConfig.totalLabel ?? 'Totaal',
        value: grandTotal,
        change: compareGrandTotal !== undefined ? grandTotal - compareGrandTotal : undefined,
      }],
    },
    {
      title: sourceConfig.breakdownLabel ?? `Uitsplitsing naar ${sourceConfig.dimCol.replace(/_/g, ' ')}`,
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
    unit: sourceConfig.unit,
    sections,
  };
}
