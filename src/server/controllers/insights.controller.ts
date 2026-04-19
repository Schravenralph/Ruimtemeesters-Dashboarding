import type { Request, Response } from 'express';
import { query } from '../db/pool.js';

interface Insight {
  id: string;
  icon: string;
  title: string;
  description: string;
  value: string;
  link?: string;
}

/**
 * Generate data-driven insights from real CBS + TSA data.
 * Returns 4-6 auto-generated insights suitable for the overview page.
 * All queries run in parallel for minimal latency.
 */
export async function getInsights(req: Request, res: Response): Promise<void> {
  const category = (req.query.category as string) || 'wonen';
  if (category === 'duurzaamheid') {
    return getDuurzaamheidInsights(res);
  }
  return getWonenInsights(res);
}

async function getWonenInsights(res: Response): Promise<void> {
  // Run all independent queries in parallel
  const [nlPop, nlPop2060, groeier, ams, aging, tsa] = await Promise.all([
    // 1. National population (latest actuals year)
    query(`
      SELECT year, value FROM data_bevolking
      WHERE geo_code = 'NL' AND age_group = 'totaal' AND gender = 'totaal' AND source = 'cbs_actuals'
      ORDER BY year DESC LIMIT 1
    `).catch(() => ({ rows: [] })),

    // 1b. 2060 prognose
    query(`
      SELECT value FROM data_bevolking
      WHERE geo_code = 'NL' AND year = 2060 AND age_group = 'totaal' AND gender = 'totaal' AND source = 'cbs_prognose'
    `).catch(() => ({ rows: [] })),

    // 2. Fastest growing gemeente (2020→2024)
    query(`
      WITH t2020 AS (
        SELECT geo_code, value FROM data_bevolking
        WHERE year = 2020 AND age_group = 'totaal' AND gender = 'totaal' AND source = 'cbs_actuals'
      ),
      t2024 AS (
        SELECT geo_code, value FROM data_bevolking
        WHERE year = 2024 AND age_group = 'totaal' AND gender = 'totaal' AND source = 'cbs_actuals'
      )
      SELECT g.name, t2024.value as pop,
             ROUND(((t2024.value - t2020.value) / t2020.value * 100)::numeric, 1) as pct
      FROM t2024 JOIN t2020 ON t2020.geo_code = t2024.geo_code
      JOIN geo_areas g ON g.code = t2024.geo_code AND g.level = 'gemeente'
      WHERE t2020.value > 10000
      ORDER BY pct DESC LIMIT 1
    `).catch(() => ({ rows: [] })),

    // 3. Amsterdam approaching 1M
    query(`
      SELECT value FROM data_bevolking
      WHERE geo_code = 'GM0363' AND age_group = 'totaal' AND gender = 'totaal' AND source = 'cbs_actuals'
      ORDER BY year DESC LIMIT 1
    `).catch(() => ({ rows: [] })),

    // 4. Aging population (65+ share)
    query(`
      SELECT
        SUM(CASE WHEN age_group IN ('65-74', '75+') THEN value ELSE 0 END) as elderly,
        SUM(CASE WHEN age_group = 'totaal' THEN value ELSE 0 END) as total
      FROM data_bevolking
      WHERE geo_code = 'NL' AND gender = 'totaal' AND source = 'cbs_actuals'
        AND year = (SELECT MAX(year) FROM data_bevolking WHERE source = 'cbs_actuals' AND geo_code = 'NL')
    `).catch(() => ({ rows: [] })),

    // 5. TSA coverage
    query(`
      SELECT COUNT(DISTINCT geo_code) as gemeenten FROM data_bevolking WHERE source = 'ruimtemeesters_prognose'
    `).catch(() => ({ rows: [] })),
  ]);

  const insights: Insight[] = [];

  // 1. NL 2060 projection
  if (nlPop.rows[0] && nlPop2060.rows[0]) {
    const now = Number(nlPop.rows[0].value);
    const future = Number(nlPop2060.rows[0].value);
    const growth = ((future - now) / now * 100).toFixed(1);
    const sign = Number(growth) >= 0 ? '+' : '';
    insights.push({
      id: 'nl-2060',
      icon: 'TrendingUp',
      title: 'Nederland in 2060',
      description: `De bevolking groeit van ${(now / 1e6).toFixed(1)}M naar ${(future / 1e6).toFixed(1)}M (${sign}${growth}%)`,
      value: `${(future / 1e6).toFixed(1)}M`,
      link: '/dashboard/prognose',
    });
  }

  // 2. Fastest grower
  if (groeier.rows[0]) {
    insights.push({
      id: 'fastest-grower',
      icon: 'ArrowUpRight',
      title: `Snelste groeier: ${groeier.rows[0].name}`,
      description: `+${groeier.rows[0].pct}% bevolkingsgroei in 4 jaar (2020–2024)`,
      value: `+${groeier.rows[0].pct}%`,
      link: '/dashboard/groeianalyse',
    });
  }

  // 3. Amsterdam milestone
  if (ams.rows[0]) {
    const pop = Number(ams.rows[0].value);
    const toMillion = 1000000 - pop;
    if (toMillion > 0 && toMillion < 200000) {
      insights.push({
        id: 'ams-1m',
        icon: 'Target',
        title: 'Amsterdam nadert 1 miljoen',
        description: `Nog ${Math.round(toMillion / 1000)}K inwoners verwijderd van de 1 miljoen grens`,
        value: `${(pop / 1e6).toFixed(2)}M`,
      });
    }
  }

  // 4. Aging
  if (aging.rows[0] && Number(aging.rows[0].total) > 0) {
    const pct = (Number(aging.rows[0].elderly) / Number(aging.rows[0].total) * 100).toFixed(1);
    insights.push({
      id: 'aging',
      icon: 'Users',
      title: 'Vergrijzing',
      description: `${pct}% van Nederland is 65 jaar of ouder`,
      value: `${pct}%`,
      link: '/dashboard/bevolking',
    });
  }

  // 5. TSA coverage
  if (tsa.rows[0] && Number(tsa.rows[0].gemeenten) > 0) {
    insights.push({
      id: 'tsa-coverage',
      icon: 'Brain',
      title: 'AI Prognose beschikbaar',
      description: `TSA Engine heeft prognoses voor ${tsa.rows[0].gemeenten} gemeenten`,
      value: `${tsa.rows[0].gemeenten}`,
      link: '/dashboard/prognose',
    });
  }

  res.json({ insights });
}

async function getDuurzaamheidInsights(res: Response): Promise<void> {
  const [co2Baseline, co2Latest, energieBaseline, energieLatest, zonneBaseline, zonneLatest, afval] = await Promise.all([
    query(`
      SELECT year, value FROM data_emissies
      WHERE geo_code = 'NL' AND sector = 'totaal' AND emission_type = 'co2'
      ORDER BY year ASC LIMIT 1
    `).catch(() => ({ rows: [] })),

    query(`
      SELECT year, value FROM data_emissies
      WHERE geo_code = 'NL' AND sector = 'totaal' AND emission_type = 'co2'
      ORDER BY year DESC LIMIT 1
    `).catch(() => ({ rows: [] })),

    query(`
      SELECT year, value FROM data_energie
      WHERE geo_code = 'NL' AND sector = 'woningen' AND fuel_type = 'totaal'
      ORDER BY year ASC LIMIT 1
    `).catch(() => ({ rows: [] })),

    query(`
      SELECT year, value FROM data_energie
      WHERE geo_code = 'NL' AND sector = 'woningen' AND fuel_type = 'totaal'
      ORDER BY year DESC LIMIT 1
    `).catch(() => ({ rows: [] })),

    query(`
      SELECT year, value FROM data_hernieuwbaar
      WHERE geo_code = 'NL' AND energy_source = 'zonnepanelen' AND metric = 'aantal_installaties' AND year = 2021
    `).catch(() => ({ rows: [] })),

    query(`
      SELECT year, value FROM data_hernieuwbaar
      WHERE geo_code = 'NL' AND energy_source = 'zonnepanelen' AND metric = 'aantal_installaties'
      ORDER BY year DESC LIMIT 1
    `).catch(() => ({ rows: [] })),

    query(`
      SELECT
        SUM(CASE WHEN waste_type = 'restafval' THEN value ELSE 0 END) as restafval,
        SUM(CASE WHEN waste_type = 'totaal' THEN value ELSE 0 END) as total
      FROM data_afval
      WHERE geo_code = 'NL' AND metric = 'kg_per_inwoner'
        AND year = (SELECT MAX(year) FROM data_afval WHERE geo_code = 'NL' AND metric = 'kg_per_inwoner')
    `).catch(() => ({ rows: [] })),
  ]);

  const insights: Insight[] = [];

  if (co2Baseline.rows[0] && co2Latest.rows[0]) {
    const from = Number(co2Baseline.rows[0].value);
    const to = Number(co2Latest.rows[0].value);
    if (from > 0) {
      const delta = ((to - from) / from * 100).toFixed(1);
      const sign = Number(delta) >= 0 ? '+' : '';
      insights.push({
        id: 'co2-trend',
        icon: 'TrendingDown',
        title: 'CO2-uitstoot sinds ' + co2Baseline.rows[0].year,
        description: `Van ${(from / 1000).toFixed(0)} Mt (${co2Baseline.rows[0].year}) naar ${(to / 1000).toFixed(0)} Mt (${co2Latest.rows[0].year})`,
        value: `${sign}${delta}%`,
      });
    }
  }

  if (energieBaseline.rows[0] && energieLatest.rows[0]) {
    const from = Number(energieBaseline.rows[0].value);
    const to = Number(energieLatest.rows[0].value);
    if (from > 0) {
      const delta = ((to - from) / from * 100).toFixed(1);
      const sign = Number(delta) >= 0 ? '+' : '';
      insights.push({
        id: 'energie-woningen',
        icon: 'Zap',
        title: 'Energieverbruik woningen',
        description: `${(from).toFixed(0)} → ${(to).toFixed(0)} TJ tussen ${energieBaseline.rows[0].year} en ${energieLatest.rows[0].year}`,
        value: `${sign}${delta}%`,
      });
    }
  }

  if (zonneBaseline.rows[0] && zonneLatest.rows[0]) {
    const from = Number(zonneBaseline.rows[0].value);
    const to = Number(zonneLatest.rows[0].value);
    if (from > 0) {
      const factor = (to / from).toFixed(1);
      insights.push({
        id: 'zonne-growth',
        icon: 'Sun',
        title: 'Zonnepaneel-installaties',
        description: `Van ${(from / 1e6).toFixed(1)}M (${zonneBaseline.rows[0].year}) naar ${(to / 1e6).toFixed(1)}M (${zonneLatest.rows[0].year})`,
        value: `×${factor}`,
      });
    }
  }

  if (afval.rows[0] && Number(afval.rows[0].total) > 0) {
    const pct = (Number(afval.rows[0].restafval) / Number(afval.rows[0].total) * 100).toFixed(1);
    insights.push({
      id: 'afval-rest',
      icon: 'Recycle',
      title: 'Restafval-aandeel',
      description: `${pct}% van huishoudelijk afval in NL is restafval`,
      value: `${pct}%`,
    });
  }

  res.json({ insights });
}
