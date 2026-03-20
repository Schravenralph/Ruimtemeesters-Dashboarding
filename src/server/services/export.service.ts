import { query } from '../db/pool.js';

interface ExportConfig {
  source: string;
  geoCode?: string;
  geoLevel?: string;
  year?: number;
  format: 'csv' | 'json';
}

interface ExportResult {
  data: Record<string, unknown>[];
  headers: string[];
  metadata: {
    source: string;
    rowCount: number;
    exportedAt: string;
    filters: Record<string, unknown>;
  };
}

const TABLE_CONFIGS: Record<string, { table: string; columns: string[]; humanHeaders: string[] }> = {
  bevolking: {
    table: 'data_bevolking',
    columns: ['geo_code', 'year', 'age_group', 'gender', 'value'],
    humanHeaders: ['Gebiedscode', 'Jaar', 'Leeftijdsgroep', 'Geslacht', 'Waarde'],
  },
  huishoudens: {
    table: 'data_huishoudens',
    columns: ['geo_code', 'year', 'household_type', 'value'],
    humanHeaders: ['Gebiedscode', 'Jaar', 'Type huishouden', 'Waarde'],
  },
  woningen: {
    table: 'data_woningen',
    columns: ['geo_code', 'year', 'tenure_type', 'dwelling_type', 'value'],
    humanHeaders: ['Gebiedscode', 'Jaar', 'Eigendomsvorm', 'Woningtype', 'Waarde'],
  },
  woningtekort: {
    table: 'data_woningtekort',
    columns: ['geo_code', 'year', 'metric', 'value'],
    humanHeaders: ['Gebiedscode', 'Jaar', 'Indicator', 'Waarde'],
  },
};

/**
 * Export data with human-readable headers and Dutch formatting.
 */
export async function exportDataset(config: ExportConfig): Promise<ExportResult> {
  const tableConfig = TABLE_CONFIGS[config.source];
  if (!tableConfig) throw new Error(`Unknown source: ${config.source}`);

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (config.geoCode) {
    conditions.push(`d.geo_code = $${idx++}`);
    params.push(config.geoCode);
  } else if (config.geoLevel) {
    conditions.push(`g.level = $${idx++}`);
    params.push(config.geoLevel);
  }

  if (config.year) {
    conditions.push(`d.year = $${idx++}`);
    params.push(config.year);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const columnSelects = tableConfig.columns.map(c => `d.${c}`).join(', ');
  const result = await query(
    `SELECT ${columnSelects}, g.name as geo_name
     FROM ${tableConfig.table} d
     JOIN geo_areas g ON g.code = d.geo_code
     ${where}
     ORDER BY d.year, g.name
     LIMIT 100000`,
    params,
  );

  return {
    data: result.rows,
    headers: ['Gebiedsnaam', ...tableConfig.humanHeaders],
    metadata: {
      source: config.source,
      rowCount: result.rows.length,
      exportedAt: new Date().toISOString(),
      filters: {
        geoCode: config.geoCode,
        geoLevel: config.geoLevel,
        year: config.year,
      },
    },
  };
}

/**
 * Generate CSV content with Dutch semicolons and BOM.
 */
export function toCsv(data: Record<string, unknown>[], headers: string[]): string {
  const bom = '\ufeff'; // UTF-8 BOM for Excel
  const headerRow = headers.join(';');
  const dataRows = data.map(row =>
    Object.values(row).map(v => {
      if (v === null || v === undefined) return '';
      const str = String(v);
      return str.includes(';') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(';'),
  );

  return bom + [headerRow, ...dataRows].join('\n');
}
