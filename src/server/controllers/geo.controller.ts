import type { Request, Response } from 'express';
import { query } from '../db/pool.js';
import { z } from 'zod';

const SearchParams = z.object({
  q: z.string().optional(),
  level: z.string().optional(),
  parentCode: z.string().optional(),
});

export async function listAreas(req: Request, res: Response): Promise<void> {
  const parsed = SearchParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid parameters' });
    return;
  }

  const { q, level, parentCode } = parsed.data;
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (level) {
    conditions.push(`level = $${idx++}`);
    params.push(level);
  }

  if (parentCode) {
    conditions.push(`parent_code = $${idx++}`);
    params.push(parentCode);
  }

  if (q) {
    conditions.push(`name ILIKE $${idx++}`);
    params.push(`%${q}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `SELECT code, name, level, parent_code FROM geo_areas ${where} ORDER BY name LIMIT 500`,
    params,
  );

  res.json({
    areas: result.rows.map(r => ({
      code: r.code,
      name: r.name,
      level: r.level,
      parentCode: r.parent_code,
    })),
  });
}

export async function getArea(req: Request, res: Response): Promise<void> {
  const { code } = req.params;

  const result = await query(
    'SELECT code, name, level, parent_code, geometry FROM geo_areas WHERE code = $1',
    [code],
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Area not found' });
    return;
  }

  const row = result.rows[0];
  res.json({
    code: row.code,
    name: row.name,
    level: row.level,
    parentCode: row.parent_code,
    geometry: row.geometry,
  });
}

/**
 * Geocode an address via PDOK Locatieserver (free, no API key).
 * Returns matching addresses with their gemeente code for geo selection.
 */
export async function geocodeAddress(req: Request, res: Response): Promise<void> {
  const q = req.query.q as string;
  if (!q || q.length < 2) {
    res.json({ results: [] });
    return;
  }

  try {
    const pdokUrl = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest?q=${encodeURIComponent(q)}&rows=8&fq=type:(adres OR woonplaats OR gemeente)`;
    const pdokRes = await fetch(pdokUrl, { signal: AbortSignal.timeout(5000) });
    if (!pdokRes.ok) {
      res.json({ results: [] });
      return;
    }

    const data = await pdokRes.json();
    const suggestions = (data.response?.docs || []).map((doc: Record<string, unknown>) => ({
      display: doc.weergavenaam as string,
      type: doc.type as string,
      gemeenteCode: doc.gemeentecode ? `GM${String(doc.gemeentecode).padStart(4, '0')}` : null,
      gemeenteNaam: doc.gemeentenaam as string | null,
    }));

    res.json({ results: suggestions });
  } catch {
    res.json({ results: [] });
  }
}

/**
 * Return GeoJSON FeatureCollection for all areas at a given level.
 * Used by the interactive map selector.
 */
export async function getGeoJson(req: Request, res: Response): Promise<void> {
  const level = req.query.level as string;
  if (!level) {
    res.status(400).json({ error: 'level parameter required' });
    return;
  }

  const result = await query(
    'SELECT code, name, level, geometry FROM geo_areas WHERE level = $1 AND geometry IS NOT NULL ORDER BY name',
    [level],
  );

  const features = result.rows.map(r => ({
    type: 'Feature' as const,
    properties: { code: r.code, name: r.name, level: r.level },
    geometry: typeof r.geometry === 'string' ? JSON.parse(r.geometry) : r.geometry,
  }));

  res.json({ type: 'FeatureCollection', features });
}

export async function getChildren(req: Request, res: Response): Promise<void> {
  const { code } = req.params;

  const result = await query(
    'SELECT code, name, level, parent_code FROM geo_areas WHERE parent_code = $1 ORDER BY name',
    [code],
  );

  res.json({
    areas: result.rows.map(r => ({
      code: r.code,
      name: r.name,
      level: r.level,
      parentCode: r.parent_code,
    })),
  });
}
