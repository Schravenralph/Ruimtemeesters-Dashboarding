import type { Request, Response } from 'express';
import { query } from '../db/pool.js';

// Pick the single best-source grand-total row for a given table.
// Filters all dimension columns to 'totaal' and prefers cbs_actuals > cbs_prognose.
const SOURCE_PRIORITY = `CASE source WHEN 'cbs_actuals' THEN 1 WHEN 'cbs_prognose' THEN 2 ELSE 3 END`;

export async function getOverviewStats(req: Request, res: Response): Promise<void> {
  const year = parseInt(req.query.year as string) || 2024;
  const geoCode = (req.query.geoCode as string) || 'NL';

  const [bevolking, huishoudens, woningen, tekort] = await Promise.all([
    query(
      `SELECT COALESCE(value, 0) as total FROM data_bevolking
       WHERE geo_code = $1 AND year = $2 AND age_group = 'totaal' AND gender = 'totaal'
       ORDER BY ${SOURCE_PRIORITY} LIMIT 1`,
      [geoCode, year],
    ),
    query(
      `SELECT COALESCE(value, 0) as total FROM data_huishoudens
       WHERE geo_code = $1 AND year = $2 AND household_type = 'totaal' AND dimension_type = 'samenstelling'
       ORDER BY ${SOURCE_PRIORITY} LIMIT 1`,
      [geoCode, year],
    ),
    query(
      `SELECT COALESCE(value, 0) as total FROM data_woningen
       WHERE geo_code = $1 AND year = $2 AND tenure_type = 'totaal' AND dwelling_type = 'totaal'
       ORDER BY ${SOURCE_PRIORITY} LIMIT 1`,
      [geoCode, year],
    ),
    query(
      `SELECT COALESCE(value, 0) as total FROM data_woningtekort
       WHERE geo_code = $1 AND year = $2 AND metric = 'tekort'
       ORDER BY ${SOURCE_PRIORITY} LIMIT 1`,
      [geoCode, year],
    ),
  ]);

  // Get previous year for comparison
  const prevYear = year - 1;
  const [prevBevolking, prevHuishoudens] = await Promise.all([
    query(
      `SELECT COALESCE(value, 0) as total FROM data_bevolking
       WHERE geo_code = $1 AND year = $2 AND age_group = 'totaal' AND gender = 'totaal'
       ORDER BY ${SOURCE_PRIORITY} LIMIT 1`,
      [geoCode, prevYear],
    ),
    query(
      `SELECT COALESCE(value, 0) as total FROM data_huishoudens
       WHERE geo_code = $1 AND year = $2 AND household_type = 'totaal' AND dimension_type = 'samenstelling'
       ORDER BY ${SOURCE_PRIORITY} LIMIT 1`,
      [geoCode, prevYear],
    ),
  ]);

  const bevolkingTotal = Number(bevolking.rows[0]?.total ?? 0);
  const prevBevolkingTotal = Number(prevBevolking.rows[0]?.total ?? 0);
  const huishoudensTotal = Number(huishoudens.rows[0]?.total ?? 0);
  const prevHuishoudensTotal = Number(prevHuishoudens.rows[0]?.total ?? 0);

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
        value: Number(woningen.rows[0]?.total ?? 0),
      },
      woningtekort: {
        value: Number(tekort.rows[0]?.total ?? 0),
      },
    },
  });
}

// Grand-total filter fragments for duurzaamheid sources. Kept together so
// overview + timeseries stay in sync.
const DUURZ_GRAND_TOTAL_FILTERS = {
  energie: "sector = 'woningen' AND fuel_type = 'totaal'",
  emissies: "sector = 'totaal' AND emission_type = 'co2'",
  hernieuwbaar: "energy_source = 'zonnepanelen' AND metric = 'aantal_installaties'",
  afval: "metric = 'kg_per_inwoner' AND waste_type = 'totaal'",
} as const;

const DUURZ_TABLES = {
  energie: 'data_energie',
  emissies: 'data_emissies',
  hernieuwbaar: 'data_hernieuwbaar',
  afval: 'data_afval',
} as const;

export async function getOverviewDuurzaamheid(req: Request, res: Response): Promise<void> {
  const year = parseInt(req.query.year as string) || 2024;
  const geoCode = (req.query.geoCode as string) || 'NL';
  const prevYear = year - 1;

  async function grandTotal(source: keyof typeof DUURZ_GRAND_TOTAL_FILTERS, y: number): Promise<number> {
    const sql = `SELECT COALESCE(value, 0) as total FROM ${DUURZ_TABLES[source]}
                 WHERE geo_code = $1 AND year = $2 AND ${DUURZ_GRAND_TOTAL_FILTERS[source]}
                 ORDER BY ${SOURCE_PRIORITY} LIMIT 1`;
    const r = await query(sql, [geoCode, y]);
    return Number(r.rows[0]?.total ?? 0);
  }

  const sources = ['energie', 'emissies', 'hernieuwbaar', 'afval'] as const;
  const [current, previous] = await Promise.all([
    Promise.all(sources.map(s => grandTotal(s, year))),
    Promise.all(sources.map(s => grandTotal(s, prevYear))),
  ]);

  const stats: Record<string, { value: number; change: string | null }> = {};
  sources.forEach((s, i) => {
    const v = current[i]!;
    const prev = previous[i]!;
    stats[s] = {
      value: v,
      change: prev > 0 ? ((v - prev) / prev * 100).toFixed(1) : null,
    };
  });

  res.json({ year, geoCode, stats });
}

export async function getTimeSeriesAgg(req: Request, res: Response): Promise<void> {
  const source = req.params.source as string;
  const geoCode = (req.query.geoCode as string) || 'NL';

  // Each source needs specific dimension filters to return only the grand total row.
  // Uses ROW_NUMBER to deduplicate overlapping sources (cbs_actuals > cbs_prognose).
  const sourceQueries: Record<string, string> = {
    bevolking: `
      WITH ranked AS (
        SELECT year, value, ROW_NUMBER() OVER (
          PARTITION BY year ORDER BY ${SOURCE_PRIORITY}
        ) as rn
        FROM data_bevolking
        WHERE geo_code = $1 AND age_group = 'totaal' AND gender = 'totaal'
      )
      SELECT year, value as total FROM ranked WHERE rn = 1 ORDER BY year`,
    huishoudens: `
      WITH ranked AS (
        SELECT year, value, ROW_NUMBER() OVER (
          PARTITION BY year ORDER BY ${SOURCE_PRIORITY}
        ) as rn
        FROM data_huishoudens
        WHERE geo_code = $1 AND household_type = 'totaal' AND dimension_type = 'samenstelling'
      )
      SELECT year, value as total FROM ranked WHERE rn = 1 ORDER BY year`,
    woningen: `
      WITH ranked AS (
        SELECT year, value, ROW_NUMBER() OVER (
          PARTITION BY year ORDER BY ${SOURCE_PRIORITY}
        ) as rn
        FROM data_woningen
        WHERE geo_code = $1 AND tenure_type = 'totaal' AND dwelling_type = 'totaal'
      )
      SELECT year, value as total FROM ranked WHERE rn = 1 ORDER BY year`,
    woningtekort: `
      WITH ranked AS (
        SELECT year, value, ROW_NUMBER() OVER (
          PARTITION BY year ORDER BY ${SOURCE_PRIORITY}
        ) as rn
        FROM data_woningtekort
        WHERE geo_code = $1 AND metric = 'tekort'
      )
      SELECT year, value as total FROM ranked WHERE rn = 1 ORDER BY year`,
    energie: `
      WITH ranked AS (
        SELECT year, value, ROW_NUMBER() OVER (
          PARTITION BY year ORDER BY ${SOURCE_PRIORITY}
        ) as rn
        FROM ${DUURZ_TABLES.energie}
        WHERE geo_code = $1 AND ${DUURZ_GRAND_TOTAL_FILTERS.energie}
      )
      SELECT year, value as total FROM ranked WHERE rn = 1 ORDER BY year`,
    emissies: `
      WITH ranked AS (
        SELECT year, value, ROW_NUMBER() OVER (
          PARTITION BY year ORDER BY ${SOURCE_PRIORITY}
        ) as rn
        FROM ${DUURZ_TABLES.emissies}
        WHERE geo_code = $1 AND ${DUURZ_GRAND_TOTAL_FILTERS.emissies}
      )
      SELECT year, value as total FROM ranked WHERE rn = 1 ORDER BY year`,
    hernieuwbaar: `
      WITH ranked AS (
        SELECT year, value, ROW_NUMBER() OVER (
          PARTITION BY year ORDER BY ${SOURCE_PRIORITY}
        ) as rn
        FROM ${DUURZ_TABLES.hernieuwbaar}
        WHERE geo_code = $1 AND ${DUURZ_GRAND_TOTAL_FILTERS.hernieuwbaar}
      )
      SELECT year, value as total FROM ranked WHERE rn = 1 ORDER BY year`,
    afval: `
      WITH ranked AS (
        SELECT year, value, ROW_NUMBER() OVER (
          PARTITION BY year ORDER BY ${SOURCE_PRIORITY}
        ) as rn
        FROM ${DUURZ_TABLES.afval}
        WHERE geo_code = $1 AND ${DUURZ_GRAND_TOTAL_FILTERS.afval}
      )
      SELECT year, value as total FROM ranked WHERE rn = 1 ORDER BY year`,
  };

  const sql = sourceQueries[source];
  if (!sql) {
    res.status(400).json({ error: 'Unknown source' });
    return;
  }

  const result = await query(sql, [geoCode]);

  res.json({
    timeSeries: result.rows.map(r => ({
      year: r.year,
      value: Number(r.total),
    })),
  });
}
