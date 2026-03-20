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
