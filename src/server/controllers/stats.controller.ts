import type { Request, Response } from 'express';
import { query } from '../db/pool.js';
import { safeIdent } from '../db/sql-utils.js';

export async function getOverviewStats(req: Request, res: Response): Promise<void> {
  const year = parseInt(req.query.year as string) || 2024;
  const geoCode = (req.query.geoCode as string) || 'NL';

  const [bevolking, huishoudens, woningen, tekort] = await Promise.all([
    query(
      'SELECT COALESCE(SUM(value), 0) as total FROM data_bevolking WHERE geo_code = $1 AND year = $2',
      [geoCode, year],
    ),
    query(
      'SELECT COALESCE(SUM(value), 0) as total FROM data_huishoudens WHERE geo_code = $1 AND year = $2',
      [geoCode, year],
    ),
    query(
      'SELECT COALESCE(SUM(value), 0) as total FROM data_woningen WHERE geo_code = $1 AND year = $2',
      [geoCode, year],
    ),
    query(
      "SELECT COALESCE(SUM(value), 0) as total FROM data_woningtekort WHERE geo_code = $1 AND year = $2 AND metric = 'tekort'",
      [geoCode, year],
    ),
  ]);

  // Get previous year for comparison
  const prevYear = year - 1;
  const [prevBevolking, prevHuishoudens] = await Promise.all([
    query(
      'SELECT COALESCE(SUM(value), 0) as total FROM data_bevolking WHERE geo_code = $1 AND year = $2',
      [geoCode, prevYear],
    ),
    query(
      'SELECT COALESCE(SUM(value), 0) as total FROM data_huishoudens WHERE geo_code = $1 AND year = $2',
      [geoCode, prevYear],
    ),
  ]);

  const bevolkingTotal = Number(bevolking.rows[0].total);
  const prevBevolkingTotal = Number(prevBevolking.rows[0].total);
  const huishoudensTotal = Number(huishoudens.rows[0].total);
  const prevHuishoudensTotal = Number(prevHuishoudens.rows[0].total);

  res.json({
    year,
    geoCode,
    stats: {
      bevolking: {
        value: bevolkingTotal,
        change: prevBevolkingTotal > 0
          ? ((bevolkingTotal - prevBevolkingTotal) / prevBevolkingTotal * 100).toFixed(1)
          : null,
      },
      huishoudens: {
        value: huishoudensTotal,
        change: prevHuishoudensTotal > 0
          ? ((huishoudensTotal - prevHuishoudensTotal) / prevHuishoudensTotal * 100).toFixed(1)
          : null,
      },
      woningen: {
        value: Number(woningen.rows[0].total),
      },
      woningtekort: {
        value: Number(tekort.rows[0].total),
      },
    },
  });
}

export async function getTimeSeriesAgg(req: Request, res: Response): Promise<void> {
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
     FROM ${safeIdent(table)}
     WHERE geo_code = $1
     GROUP BY year
     ORDER BY year`,
    [geoCode],
  );

  res.json({
    timeSeries: result.rows.map(r => ({
      year: r.year,
      value: Number(r.total),
    })),
  });
}
