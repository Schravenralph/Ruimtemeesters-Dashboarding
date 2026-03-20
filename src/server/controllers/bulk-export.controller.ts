import type { Request, Response } from 'express';
import { query } from '../db/pool.js';
import { toCsv } from '../services/export.service.js';

/**
 * Bulk export controller for downloading all data from multiple sources.
 * Supports CSV and JSON formats with optional filtering.
 */
export async function bulkExport(req: Request, res: Response): Promise<void> {
  const format = (req.query.format as string) || 'json';
  const sources = (req.query.sources as string)?.split(',') || ['bevolking', 'huishoudens', 'woningen', 'woningtekort'];
  const year = req.query.year ? parseInt(req.query.year as string) : undefined;
  const geoCode = req.query.geoCode as string | undefined;

  const validSources = ['bevolking', 'huishoudens', 'woningen', 'woningtekort'];
  const filteredSources = sources.filter(s => validSources.includes(s));

  if (filteredSources.length === 0) {
    res.status(400).json({ error: 'No valid sources specified' });
    return;
  }

  const results: Record<string, unknown[]> = {};

  for (const source of filteredSources) {
    const table = `data_${source}`;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (year) {
      conditions.push(`d.year = $${idx++}`);
      params.push(year);
    }
    if (geoCode) {
      conditions.push(`d.geo_code = $${idx++}`);
      params.push(geoCode);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT d.*, g.name as geo_name
       FROM ${table} d
       JOIN geo_areas g ON g.code = d.geo_code
       ${where}
       ORDER BY d.year, g.name
       LIMIT 100000`,
      params,
    );

    results[source] = result.rows;
  }

  if (format === 'csv') {
    // For CSV, combine all sources into one file with a source column
    const allRows: Record<string, unknown>[] = [];
    for (const [source, rows] of Object.entries(results)) {
      for (const row of rows as Record<string, unknown>[]) {
        allRows.push({ source, ...row });
      }
    }

    const headers = allRows.length > 0
      ? ['Bron', ...Object.keys(allRows[0]).filter(k => k !== 'source')]
      : ['Bron'];

    const csv = toCsv(allRows, headers);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="ruimtemeesters_bulk_export.csv"');
    res.send(csv);
  } else {
    res.json({
      exportedAt: new Date().toISOString(),
      sources: filteredSources,
      filters: { year, geoCode },
      data: results,
      totalRows: Object.values(results).reduce((sum, rows) => sum + rows.length, 0),
    });
  }
}
