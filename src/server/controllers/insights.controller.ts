import type { Request, Response } from 'express';
import { query } from '../db/pool.js';

const SOURCE_PRIORITY = `CASE source WHEN 'cbs_actuals' THEN 1 WHEN 'cbs_prognose' THEN 2 ELSE 3 END`;

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
 */
export async function getInsights(_req: Request, res: Response): Promise<void> {
  const insights: Insight[] = [];

  // 1. National population (current + prognose)
  const nlPop = await query(`
    SELECT year, value FROM data_bevolking
    WHERE geo_code = 'NL' AND age_group = 'totaal' AND gender = 'totaal'
    ORDER BY ${SOURCE_PRIORITY} LIMIT 1
  `).catch(() => ({ rows: [] }));

  const nlPop2060 = await query(`
    SELECT value FROM data_bevolking
    WHERE geo_code = 'NL' AND year = 2060 AND age_group = 'totaal' AND gender = 'totaal' AND source = 'cbs_prognose'
  `).catch(() => ({ rows: [] }));

  if (nlPop.rows[0] && nlPop2060.rows[0]) {
    const now = Number(nlPop.rows[0].value);
    const future = Number(nlPop2060.rows[0].value);
    const growth = ((future - now) / now * 100).toFixed(1);
    insights.push({
      id: 'nl-2060',
      icon: 'TrendingUp',
      title: 'Nederland in 2060',
      description: `De bevolking groeit van ${(now / 1e6).toFixed(1)}M naar ${(future / 1e6).toFixed(1)}M (+${growth}%)`,
      value: `${(future / 1e6).toFixed(1)}M`,
      link: '/dashboard/prognose',
    });
  }

  // 2. Fastest growing gemeente (2020→2024)
  const groeier = await query(`
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
  `).catch(() => ({ rows: [] }));

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

  // 3. Largest city approaching milestone
  const ams = await query(`
    SELECT value FROM data_bevolking
    WHERE geo_code = 'GM0363' AND age_group = 'totaal' AND gender = 'totaal' AND source = 'cbs_actuals'
    ORDER BY year DESC LIMIT 1
  `).catch(() => ({ rows: [] }));

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

  // 4. Aging population (65+ share)
  const aging = await query(`
    SELECT
      SUM(CASE WHEN age_group IN ('65-74', '75+') THEN value ELSE 0 END) as elderly,
      SUM(CASE WHEN age_group = 'totaal' THEN value ELSE 0 END) as total
    FROM data_bevolking
    WHERE geo_code = 'NL' AND gender = 'totaal' AND source = 'cbs_actuals'
      AND year = (SELECT MAX(year) FROM data_bevolking WHERE source = 'cbs_actuals' AND geo_code = 'NL')
  `).catch(() => ({ rows: [] }));

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
  const tsa = await query(`
    SELECT COUNT(DISTINCT geo_code) as gemeenten FROM data_bevolking WHERE source = 'ruimtemeesters_prognose'
  `).catch(() => ({ rows: [] }));

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
