import type { Request, Response } from 'express';
import { query } from '../db/pool.js';
import { safeIdent } from '../db/sql-utils.js';
import { DataQueryParams } from '../../shared/api/contracts.js';
import { getDataSource } from '../services/data-source-registry.js';

// Tables that have confidence_lower/confidence_upper columns (migration 011)
const TABLES_WITH_CONFIDENCE = ['data_bevolking', 'data_huishoudens', 'data_woningen', 'data_woningtekort'];

export async function queryData(req: Request, res: Response): Promise<void> {
  const parsed = DataQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query parameters', details: parsed.error.flatten() });
    return;
  }

  const { source, geoCode, geoLevel, year, dimension, dimensionValue, limit, offset, dataOrigin, dimensionType } = parsed.data;

  const sourceDef = await getDataSource(source);
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
    // Filtering to a specific dimension value
    const dimCol = sourceDef.dimensionColumns.find(c =>
      c.replace(/_/g, '') === dimension.replace(/_/g, ''),
    );
    if (dimCol) {
      conditions.push(`d.${safeIdent(dimCol)} = $${paramIdx++}`);
      params.push(dimensionValue);
    }
  } else if (dimension) {
    // Browsing a dimension without a specific value:
    // 1. Exclude 'totaal' from the active dimension (it's a subtotal row)
    // 2. Pin all OTHER dimensions to 'totaal' to avoid cross-product double-counting
    const dimCol = sourceDef.dimensionColumns.find(c =>
      c.replace(/_/g, '') === dimension.replace(/_/g, ''),
    );
    if (dimCol) {
      conditions.push(`d.${safeIdent(dimCol)} != 'totaal'`);
      for (const otherCol of sourceDef.dimensionColumns) {
        if (otherCol !== dimCol) {
          conditions.push(`d.${safeIdent(otherCol)} = 'totaal'`);
        }
      }
    }
  } else if (sourceDef.dimensionColumns.length > 0) {
    // No dimension specified — return only the grand totals to avoid overcounting
    for (const col of sourceDef.dimensionColumns) {
      conditions.push(`d.${safeIdent(col)} = 'totaal'`);
    }
  }

  // Filter by data origin (cbs_actuals vs cbs_prognose)
  if (dataOrigin) {
    conditions.push(`d.source = $${paramIdx++}`);
    params.push(dataOrigin);
  }

  // Apply source-specific default filters from registry
  if (sourceDef.defaultFilters) {
    for (const [col, defaultVal] of Object.entries(sourceDef.defaultFilters)) {
      // Check both snake_case (DB column) and camelCase (query param) forms
      const camelCol = col.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      const queryVal = (req.query[col] as string) || (req.query[camelCol] as string);
      conditions.push(`d.${safeIdent(col)} = $${paramIdx++}`);
      params.push(queryVal || defaultVal);
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limitClause = limit ? `LIMIT ${Math.min(limit, 10000)}` : 'LIMIT 1000';
  const offsetClause = offset ? `OFFSET ${offset}` : '';

  const dimSelects = sourceDef.dimensionColumns
    .map(c => `d.${safeIdent(c)}`)
    .join(', ');

  const hasConfidence = TABLES_WITH_CONFIDENCE.includes(sourceDef.tableName);
  const confidenceSelect = hasConfidence ? ', d.confidence_lower, d.confidence_upper' : '';

  const sql = `
    SELECT d.geo_code, g.name as geo_name, d.year,
           ${dimSelects},
           d.${safeIdent(sourceDef.valueColumn)} as value,
           d.source as data_source${confidenceSelect}
    FROM ${safeIdent(sourceDef.tableName)} d
    JOIN geo_areas g ON g.code = d.geo_code
    ${whereClause}
    ORDER BY d.year, g.name
    ${limitClause} ${offsetClause}
  `;

  const result = await query(sql, params);

  const countSql = `
    SELECT COUNT(*) as total
    FROM ${safeIdent(sourceDef.tableName)} d
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
    source: row.data_source || 'cbs_actuals',
    ...(row.confidence_lower != null ? { confidenceLower: Number(row.confidence_lower) } : {}),
    ...(row.confidence_upper != null ? { confidenceUpper: Number(row.confidence_upper) } : {}),
  }));

  res.json({
    data,
    metadata: {
      source,
      totalRecords: parseInt(countResult.rows[0].total, 10),
      unit: sourceDef.unit,
    },
  });
}

export async function queryTimeSeries(req: Request, res: Response): Promise<void> {
  const source = req.query.source as string;
  const geoCode = req.query.geoCode as string;
  const dimension = req.query.dimension as string;
  const dimensionValue = req.query.dimensionValue as string;

  const sourceDef = await getDataSource(source);
  if (!sourceDef) {
    res.status(400).json({ error: `Unknown data source: ${source}` });
    return;
  }

  if (!geoCode) {
    res.status(400).json({ error: 'geoCode required for time series' });
    return;
  }

  const conditions: string[] = ['d.geo_code = $1'];
  const params: unknown[] = [geoCode];
  let paramIdx = 2;

  if (dimension && dimensionValue) {
    const dimCol = sourceDef.dimensionColumns.find(c =>
      c.replace(/_/g, '') === dimension.replace(/_/g, ''),
    );
    if (dimCol) {
      conditions.push(`d.${safeIdent(dimCol)} = $${paramIdx++}`);
      params.push(dimensionValue);
    }
  }

  // Apply default filters from registry
  if (sourceDef.defaultFilters) {
    for (const [col, defaultVal] of Object.entries(sourceDef.defaultFilters)) {
      const camelCol = col.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      const queryVal = (req.query[col] as string) || (req.query[camelCol] as string);
      conditions.push(`d.${safeIdent(col)} = $${paramIdx++}`);
      params.push(queryVal || defaultVal);
    }
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const tsHasConfidence = TABLES_WITH_CONFIDENCE.includes(sourceDef.tableName);
  const tsConfidenceSelect = tsHasConfidence ? ', d.confidence_lower, d.confidence_upper' : '';

  const sql = `
    SELECT d.year, d.${safeIdent(sourceDef.valueColumn)} as value, d.source as data_source${tsConfidenceSelect}
    FROM ${safeIdent(sourceDef.tableName)} d
    ${whereClause}
    ORDER BY d.year
    LIMIT 500
  `;

  const result = await query(sql, params);

  const data = result.rows.map(row => ({
    geoCode,
    year: row.year,
    value: Number(row.value),
    source: row.data_source || 'cbs_actuals',
    confidenceLower: row.confidence_lower ? Number(row.confidence_lower) : undefined,
    confidenceUpper: row.confidence_upper ? Number(row.confidence_upper) : undefined,
    dimension: dimension || sourceDef.dimensionColumns[0],
    dimensionValue: dimensionValue || 'totaal',
  }));

  res.json({ data });
}

export async function getAvailableYears(req: Request, res: Response): Promise<void> {
  const source = req.params.source as string;
  const sourceDef = await getDataSource(source);
  if (!sourceDef) {
    res.status(400).json({ error: `Unknown data source: ${source}` });
    return;
  }

  const result = await query(
    `SELECT DISTINCT year FROM ${safeIdent(sourceDef.tableName)} ORDER BY year`,
  );

  res.json({ years: result.rows.map(r => r.year) });
}

export async function getDimensions(req: Request, res: Response): Promise<void> {
  const source = req.params.source as string;
  const sourceDef = await getDataSource(source);
  if (!sourceDef) {
    res.status(400).json({ error: `Unknown data source: ${source}` });
    return;
  }

  const dimensions = await Promise.all(
    sourceDef.dimensionColumns.map(async col => {
      const result = await query(
        `SELECT DISTINCT ${safeIdent(col)} as value FROM ${safeIdent(sourceDef.tableName)} WHERE ${safeIdent(col)} IS NOT NULL ORDER BY ${safeIdent(col)}`,
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
