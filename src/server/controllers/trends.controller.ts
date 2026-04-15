import type { Request, Response } from 'express';
import { query } from '../db/pool.js';

// Priority: cbs_actuals > cbs_prognose > ruimtemeesters_prognose
const SOURCE_PRIORITY = `CASE source WHEN 'cbs_actuals' THEN 1 WHEN 'cbs_prognose' THEN 2 ELSE 3 END`;

// Per-source queries that filter dimensions to 'totaal' and deduplicate sources.
// Without this, SUM(value) counts every dimension row (age groups, genders, etc.),
// inflating totals by 2-4x.
const TREND_QUERIES: Record<string, string> = {
  bevolking: `
    WITH ranked AS (
      SELECT year, value, ROW_NUMBER() OVER (PARTITION BY year ORDER BY ${SOURCE_PRIORITY}) as rn
      FROM data_bevolking
      WHERE geo_code = $1 AND age_group = 'totaal' AND gender = 'totaal'
    )
    SELECT year, value as total FROM ranked WHERE rn = 1 ORDER BY year`,
  huishoudens: `
    WITH ranked AS (
      SELECT year, value, ROW_NUMBER() OVER (PARTITION BY year ORDER BY ${SOURCE_PRIORITY}) as rn
      FROM data_huishoudens
      WHERE geo_code = $1 AND household_type = 'totaal' AND dimension_type = 'samenstelling'
    )
    SELECT year, value as total FROM ranked WHERE rn = 1 ORDER BY year`,
  woningen: `
    WITH ranked AS (
      SELECT year, value, ROW_NUMBER() OVER (PARTITION BY year ORDER BY ${SOURCE_PRIORITY}) as rn
      FROM data_woningen
      WHERE geo_code = $1 AND tenure_type = 'totaal' AND dwelling_type = 'totaal'
    )
    SELECT year, value as total FROM ranked WHERE rn = 1 ORDER BY year`,
  woningtekort: `
    WITH ranked AS (
      SELECT year, value, ROW_NUMBER() OVER (PARTITION BY year ORDER BY ${SOURCE_PRIORITY}) as rn
      FROM data_woningtekort
      WHERE geo_code = $1 AND metric = 'tekort'
    )
    SELECT year, value as total FROM ranked WHERE rn = 1 ORDER BY year`,
};

/**
 * Calculate growth trends for a data source.
 * Returns year-over-year growth rates and compound annual growth rate (CAGR).
 */
export async function getTrends(req: Request, res: Response): Promise<void> {
  const source = req.params.source as string;
  const geoCode = (req.query.geoCode as string) || 'NL';

  const sql = TREND_QUERIES[source];
  if (!sql) {
    res.status(400).json({ error: 'Unknown source' });
    return;
  }

  const result = await query(sql, [geoCode]);

  const timeSeries = result.rows.map(r => ({
    year: r.year,
    value: Number(r.total),
  }));

  // Calculate year-over-year growth
  const growth = timeSeries.map((point, i) => {
    if (i === 0) return { ...point, growthRate: null, absoluteChange: null };
    const prev = timeSeries[i - 1];
    const absoluteChange = point.value - prev.value;
    const growthRate = prev.value > 0 ? (absoluteChange / prev.value) * 100 : null;
    return { ...point, growthRate, absoluteChange };
  });

  // Calculate CAGR
  let cagr: number | null = null;
  if (timeSeries.length >= 2) {
    const first = timeSeries[0];
    const last = timeSeries[timeSeries.length - 1];
    const years = last.year - first.year;
    if (years > 0 && first.value > 0) {
      cagr = (Math.pow(last.value / first.value, 1 / years) - 1) * 100;
    }
  }

  // Find min/max years
  const maxYear = growth.reduce((max, g) =>
    (g.growthRate !== null && (max === null || g.growthRate > max.growthRate!))
      ? g : max,
    growth[0],
  );

  const minYear = growth.reduce((min, g) =>
    (g.growthRate !== null && (min === null || g.growthRate! < min.growthRate!))
      ? g : min,
    growth[0],
  );

  res.json({
    source,
    geoCode,
    timeSeries: growth,
    summary: {
      cagr,
      totalGrowth: timeSeries.length >= 2
        ? ((timeSeries[timeSeries.length - 1].value - timeSeries[0].value) / timeSeries[0].value * 100)
        : null,
      peakGrowthYear: maxYear?.year,
      peakGrowthRate: maxYear?.growthRate,
      lowestGrowthYear: minYear?.year,
      lowestGrowthRate: minYear?.growthRate,
      latestValue: timeSeries[timeSeries.length - 1]?.value,
      earliestValue: timeSeries[0]?.value,
    },
  });
}

// Per-source comparison queries — dimension-filtered + source-deduplicated
const COMPARE_QUERIES: Record<string, string> = {
  bevolking: `
    WITH ranked AS (
      SELECT d.geo_code, g.name as geo_name, d.year, d.value,
             ROW_NUMBER() OVER (PARTITION BY d.geo_code, d.year ORDER BY ${SOURCE_PRIORITY}) as rn
      FROM data_bevolking d
      JOIN geo_areas g ON g.code = d.geo_code
      WHERE d.geo_code = ANY($1) AND d.age_group = 'totaal' AND d.gender = 'totaal'
    )
    SELECT geo_code, geo_name, year, value as total FROM ranked WHERE rn = 1 ORDER BY year`,
  huishoudens: `
    WITH ranked AS (
      SELECT d.geo_code, g.name as geo_name, d.year, d.value,
             ROW_NUMBER() OVER (PARTITION BY d.geo_code, d.year ORDER BY ${SOURCE_PRIORITY}) as rn
      FROM data_huishoudens d
      JOIN geo_areas g ON g.code = d.geo_code
      WHERE d.geo_code = ANY($1) AND d.household_type = 'totaal' AND d.dimension_type = 'samenstelling'
    )
    SELECT geo_code, geo_name, year, value as total FROM ranked WHERE rn = 1 ORDER BY year`,
  woningen: `
    WITH ranked AS (
      SELECT d.geo_code, g.name as geo_name, d.year, d.value,
             ROW_NUMBER() OVER (PARTITION BY d.geo_code, d.year ORDER BY ${SOURCE_PRIORITY}) as rn
      FROM data_woningen d
      JOIN geo_areas g ON g.code = d.geo_code
      WHERE d.geo_code = ANY($1) AND d.tenure_type = 'totaal' AND d.dwelling_type = 'totaal'
    )
    SELECT geo_code, geo_name, year, value as total FROM ranked WHERE rn = 1 ORDER BY year`,
  woningtekort: `
    WITH ranked AS (
      SELECT d.geo_code, g.name as geo_name, d.year, d.value,
             ROW_NUMBER() OVER (PARTITION BY d.geo_code, d.year ORDER BY ${SOURCE_PRIORITY}) as rn
      FROM data_woningtekort d
      JOIN geo_areas g ON g.code = d.geo_code
      WHERE d.geo_code = ANY($1) AND d.metric = 'tekort'
    )
    SELECT geo_code, geo_name, year, value as total FROM ranked WHERE rn = 1 ORDER BY year`,
};

/**
 * Compare trends across multiple geographic areas.
 */
export async function compareTrends(req: Request, res: Response): Promise<void> {
  const source = req.params.source as string;
  const geoCodes = (req.query.geoCodes as string)?.split(',') || [];

  const sql = COMPARE_QUERIES[source];
  if (!sql || geoCodes.length === 0) {
    res.status(400).json({ error: 'Invalid parameters' });
    return;
  }

  if (geoCodes.length > 10) {
    res.status(400).json({ error: 'Maximum 10 areas for comparison' });
    return;
  }

  const result = await query(sql, [geoCodes]);

  // Group by geo code
  const grouped = new Map<string, { name: string; data: { year: number; value: number }[] }>();
  for (const row of result.rows) {
    if (!grouped.has(row.geo_code)) {
      grouped.set(row.geo_code, { name: row.geo_name, data: [] });
    }
    grouped.get(row.geo_code)!.data.push({
      year: row.year,
      value: Number(row.total),
    });
  }

  res.json({
    source,
    areas: Object.fromEntries(grouped),
  });
}
