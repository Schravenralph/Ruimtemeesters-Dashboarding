import pg from 'pg';
import { query } from '../db/pool.js';

/**
 * Geographic hierarchy service.
 * Provides methods for navigating the geographic hierarchy tree.
 */

interface GeoNode {
  code: string;
  name: string;
  level: string;
  parentCode: string | null;
  childCount: number;
}

/**
 * Get the full hierarchy path from a geo area to the national level.
 * Returns [land, provincie, corop?, gemeente] path.
 */
export async function getHierarchyPath(code: string): Promise<GeoNode[]> {
  const path: GeoNode[] = [];
  let currentCode: string | null = code;

  while (currentCode) {
    const result: pg.QueryResult = await query(
      `SELECT g.code, g.name, g.level, g.parent_code,
              (SELECT COUNT(*) FROM geo_areas c WHERE c.parent_code = g.code) as child_count
       FROM geo_areas g WHERE g.code = $1`,
      [currentCode],
    );

    if (result.rows.length === 0) break;

    const row: Record<string, string> = result.rows[0];
    path.unshift({
      code: row.code,
      name: row.name,
      level: row.level,
      parentCode: row.parent_code,
      childCount: parseInt(row.child_count, 10),
    });

    currentCode = row.parent_code;
  }

  return path;
}

/**
 * Get all siblings (areas at the same level with the same parent).
 */
export async function getSiblings(code: string): Promise<GeoNode[]> {
  const result = await query(
    `SELECT g2.code, g2.name, g2.level, g2.parent_code,
            (SELECT COUNT(*) FROM geo_areas c WHERE c.parent_code = g2.code) as child_count
     FROM geo_areas g1
     JOIN geo_areas g2 ON g2.parent_code = g1.parent_code AND g2.level = g1.level
     WHERE g1.code = $1
     ORDER BY g2.name`,
    [code],
  );

  return result.rows.map(r => ({
    code: r.code,
    name: r.name,
    level: r.level,
    parentCode: r.parent_code,
    childCount: parseInt(r.child_count, 10),
  }));
}

/**
 * Get all descendants at a specific level.
 * e.g., get all gemeenten within a provincie.
 */
export async function getDescendants(code: string, targetLevel: string): Promise<GeoNode[]> {
  // For now, support direct parent-child relationships
  const result = await query(
    `WITH RECURSIVE descendants AS (
       SELECT code, name, level, parent_code FROM geo_areas WHERE parent_code = $1
       UNION ALL
       SELECT g.code, g.name, g.level, g.parent_code
       FROM geo_areas g JOIN descendants d ON g.parent_code = d.code
     )
     SELECT d.code, d.name, d.level, d.parent_code,
            (SELECT COUNT(*) FROM geo_areas c WHERE c.parent_code = d.code) as child_count
     FROM descendants d
     WHERE d.level = $2
     ORDER BY d.name`,
    [code, targetLevel],
  );

  return result.rows.map(r => ({
    code: r.code,
    name: r.name,
    level: r.level,
    parentCode: r.parent_code,
    childCount: parseInt(r.child_count, 10),
  }));
}
