import type { Request, Response } from 'express';
import { query } from '../db/pool.js';
import { z } from 'zod';
import { getDataSource } from '../services/data-source-registry.js';

const IDENT_RE = /^[a-z_][a-z0-9_]*$/i;
function safeIdent(name: string): string {
  if (!IDENT_RE.test(name)) throw new Error(`Invalid SQL identifier: ${name}`);
  return `"${name}"`;
}

const ExportParams = z.object({
  source: z.string(),
  format: z.enum(['csv', 'json']),
  geoCode: z.string().optional(),
  geoLevel: z.string().optional(),
  year: z.coerce.number().optional(),
});

export async function exportData(req: Request, res: Response): Promise<void> {
  const parsed = ExportParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid parameters', details: parsed.error.flatten() });
    return;
  }

  const { source, format, geoCode, geoLevel, year } = parsed.data;
  const sourceDef = await getDataSource(source);

  if (!sourceDef) {
    res.status(400).json({ error: `Unknown source: ${source}` });
    return;
  }

  // Derive export columns from registry
  const columns = sourceDef.exportColumns
    || ['geo_code', 'year', ...sourceDef.dimensionColumns, sourceDef.valueColumn, 'source'];

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (geoCode) {
    conditions.push(`d.geo_code = $${idx++}`);
    params.push(geoCode);
  } else if (geoLevel) {
    conditions.push(`g.level = $${idx++}`);
    params.push(geoLevel);
  }

  if (year) {
    conditions.push(`d.year = $${idx++}`);
    params.push(year);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const columnSelects = columns.map(c => `d.${safeIdent(c)}`).join(', ');
  const sql = `
    SELECT ${columnSelects}, g.name as geo_name
    FROM ${safeIdent(sourceDef.tableName)} d
    JOIN geo_areas g ON g.code = d.geo_code
    ${whereClause}
    ORDER BY d.year, g.name
    LIMIT 50000
  `;

  const result = await query(sql, params);

  if (format === 'csv') {
    const headers = ['geo_name', ...columns];
    const csvRows = [
      headers.join(','),
      ...result.rows.map(row =>
        headers.map(h => {
          const value = row[h];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
          return String(value);
        }).join(',')
      ),
    ];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${source}_export.csv"`);
    res.send(csvRows.join('\n'));
  } else {
    res.json({
      data: result.rows,
      metadata: {
        source,
        totalRecords: result.rows.length,
        exportedAt: new Date().toISOString(),
      },
    });
  }
}
