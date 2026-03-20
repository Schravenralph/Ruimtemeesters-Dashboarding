import type { Request, Response } from 'express';
import { query } from '../db/pool.js';
import { DataQueryParams } from '../../shared/api/contracts.js';

const DATA_SOURCES: Record<string, {
  table: string;
  dimensionColumns: string[];
  valueColumn: string;
}> = {
  bevolking: {
    table: 'data_bevolking',
    dimensionColumns: ['age_group', 'gender'],
    valueColumn: 'value',
  },
  huishoudens: {
    table: 'data_huishoudens',
    dimensionColumns: ['household_type'],
    valueColumn: 'value',
  },
  woningen: {
    table: 'data_woningen',
    dimensionColumns: ['tenure_type', 'dwelling_type'],
    valueColumn: 'value',
  },
  woningtekort: {
    table: 'data_woningtekort',
    dimensionColumns: ['metric'],
    valueColumn: 'value',
  },
};

export async function queryData(req: Request, res: Response): Promise<void> {
  const parsed = DataQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query parameters', details: parsed.error.flatten() });
    return;
  }

  const { source, geoCode, geoLevel, year, dimension, dimensionValue, limit, offset } = parsed.data;

  const sourceDef = DATA_SOURCES[source];
  if (!sourceDef) {
    res.status(400).json({ error: `Unknown data source: ${source}` });
    return;
  }

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (geoCode) {
    conditions.push(`d.geo_code = $${paramIdx++}`);
    params.push(geoCode);
  } else if (geoLevel) {
    conditions.push(`g.level = $${paramIdx++}`);
    params.push(geoLevel);
  }

  if (year) {
    conditions.push(`d.year = $${paramIdx++}`);
    params.push(year);
  }

  if (dimension && dimensionValue) {
    const dimCol = sourceDef.dimensionColumns.find(c =>
      c.replace(/_/g, '') === dimension.replace(/_/g, ''),
    );
    if (dimCol) {
      conditions.push(`d.${dimCol} = $${paramIdx++}`);
      params.push(dimensionValue);
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limitClause = limit ? `LIMIT ${Math.min(limit, 10000)}` : 'LIMIT 1000';
  const offsetClause = offset ? `OFFSET ${offset}` : '';

  // Build dimension select columns
  const dimSelects = sourceDef.dimensionColumns
    .map(c => `d.${c}`)
    .join(', ');

  const sql = `
    SELECT d.geo_code, g.name as geo_name, d.year,
           ${dimSelects},
           d.${sourceDef.valueColumn} as value
    FROM ${sourceDef.table} d
    JOIN geo_areas g ON g.code = d.geo_code
    ${whereClause}
    ORDER BY d.year, g.name
    ${limitClause} ${offsetClause}
  `;

  const result = await query(sql, params);

  // Count total
  const countSql = `
    SELECT COUNT(*) as total
    FROM ${sourceDef.table} d
    JOIN geo_areas g ON g.code = d.geo_code
    ${whereClause}
  `;
  const countResult = await query(countSql, params);

  const data = result.rows.map(row => ({
    geoCode: row.geo_code,
    geoName: row.geo_name,
    year: row.year,
    dimension: dimension || sourceDef.dimensionColumns[0],
    dimensionValue: row[sourceDef.dimensionColumns[0]],
    value: Number(row.value),
  }));

  res.json({
    data,
    metadata: {
      source,
      totalRecords: parseInt(countResult.rows[0].total, 10),
      unit: source === 'woningtekort' ? 'percentage' : 'aantal',
    },
  });
}

export async function getAvailableYears(req: Request, res: Response): Promise<void> {
  const { source } = req.params;
  const sourceDef = DATA_SOURCES[source];
  if (!sourceDef) {
    res.status(400).json({ error: `Unknown data source: ${source}` });
    return;
  }

  const result = await query(
    `SELECT DISTINCT year FROM ${sourceDef.table} ORDER BY year`,
  );

  res.json({ years: result.rows.map(r => r.year) });
}

export async function getDimensions(req: Request, res: Response): Promise<void> {
  const { source } = req.params;
  const sourceDef = DATA_SOURCES[source];
  if (!sourceDef) {
    res.status(400).json({ error: `Unknown data source: ${source}` });
    return;
  }

  const dimensions = await Promise.all(
    sourceDef.dimensionColumns.map(async col => {
      const result = await query(
        `SELECT DISTINCT ${col} as value FROM ${sourceDef.table} WHERE ${col} IS NOT NULL ORDER BY ${col}`,
      );
      return {
        id: col,
        name: col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        values: result.rows.map(r => ({ key: r.value, label: r.value })),
      };
    }),
  );

  res.json({ dimensions });
}
