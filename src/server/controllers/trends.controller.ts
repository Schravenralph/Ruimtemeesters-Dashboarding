import type { Request, Response } from 'express';
import { query } from '../db/pool.js';

/**
 * Calculate growth trends for a data source.
 * Returns year-over-year growth rates and compound annual growth rate (CAGR).
 */
export async function getTrends(req: Request, res: Response): Promise<void> {
  const source = req.params.source;
  const geoCode = (req.query.geoCode as string) || 'NL';

  const tableMap: Record<string, string> = {
    bevolking: 'data_bevolking',
    huishoudens: 'data_huishoudens',
    woningen: 'data_woningen',
    woningtekort: 'data_woningtekort',
  };

  const table = tableMap[source];
  if (!table) {
    res.status(400).json({ error: 'Unknown source' });
    return;
  }

  const result = await query(
    `SELECT year, SUM(value) as total
     FROM ${table}
     WHERE geo_code = $1
     GROUP BY year
     ORDER BY year`,
    [geoCode],
  );

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

/**
 * Compare trends across multiple geographic areas.
 */
export async function compareTrends(req: Request, res: Response): Promise<void> {
  const source = req.params.source;
  const geoCodes = (req.query.geoCodes as string)?.split(',') || [];

  const tableMap: Record<string, string> = {
    bevolking: 'data_bevolking',
    huishoudens: 'data_huishoudens',
    woningen: 'data_woningen',
    woningtekort: 'data_woningtekort',
  };

  const table = tableMap[source];
  if (!table || geoCodes.length === 0) {
    res.status(400).json({ error: 'Invalid parameters' });
    return;
  }

  if (geoCodes.length > 10) {
    res.status(400).json({ error: 'Maximum 10 areas for comparison' });
    return;
  }

  const result = await query(
    `SELECT d.geo_code, g.name as geo_name, d.year, SUM(d.value) as total
     FROM ${table} d
     JOIN geo_areas g ON g.code = d.geo_code
     WHERE d.geo_code = ANY($1)
     GROUP BY d.geo_code, g.name, d.year
     ORDER BY d.year`,
    [geoCodes],
  );

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
