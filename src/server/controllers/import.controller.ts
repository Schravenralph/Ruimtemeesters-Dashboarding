import type { Request, Response } from 'express';
import { query, getClient } from '../db/pool.js';
import { z } from 'zod';

const VALID_SOURCES = ['bevolking', 'huishoudens', 'woningen', 'woningtekort'];

const ImportSchema = z.object({
  source: z.enum(['bevolking', 'huishoudens', 'woningen', 'woningtekort']),
  data: z.array(z.record(z.union([z.string(), z.number(), z.null()]))),
});

export async function importData(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const parsed = ImportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  const { source, data } = parsed.data;

  if (data.length === 0) {
    res.status(400).json({ error: 'No data provided' });
    return;
  }

  if (data.length > 50000) {
    res.status(400).json({ error: 'Maximum 50,000 rows per import' });
    return;
  }

  // Track the import
  const importResult = await query(
    `INSERT INTO data_imports (user_id, source, filename, row_count, status)
     VALUES ($1, $2, $3, $4, 'processing')
     RETURNING id`,
    [req.user.id, source, `api-import-${Date.now()}`, data.length],
  );
  const importId = importResult.rows[0].id;

  const client = await getClient();

  try {
    await client.query('BEGIN');

    let inserted = 0;

    for (const row of data) {
      switch (source) {
        case 'bevolking': {
          const geoCode = String(row.geo_code || row.geoCode);
          const year = Number(row.year);
          const ageGroup = row.age_group || row.ageGroup || null;
          const gender = row.gender || null;
          const value = Number(row.value);

          if (!geoCode || isNaN(year) || isNaN(value)) continue;

          await client.query(
            `INSERT INTO data_bevolking (geo_code, year, age_group, gender, value)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (geo_code, year, age_group, gender)
             DO UPDATE SET value = $5`,
            [geoCode, year, ageGroup, gender, value],
          );
          inserted++;
          break;
        }
        case 'huishoudens': {
          const geoCode = String(row.geo_code || row.geoCode);
          const year = Number(row.year);
          const householdType = row.household_type || row.householdType || null;
          const value = Number(row.value);

          if (!geoCode || isNaN(year) || isNaN(value)) continue;

          await client.query(
            `INSERT INTO data_huishoudens (geo_code, year, household_type, value)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (geo_code, year, household_type)
             DO UPDATE SET value = $4`,
            [geoCode, year, householdType, value],
          );
          inserted++;
          break;
        }
        case 'woningen': {
          const geoCode = String(row.geo_code || row.geoCode);
          const year = Number(row.year);
          const tenureType = row.tenure_type || row.tenureType || null;
          const dwellingType = row.dwelling_type || row.dwellingType || null;
          const value = Number(row.value);

          if (!geoCode || isNaN(year) || isNaN(value)) continue;

          await client.query(
            `INSERT INTO data_woningen (geo_code, year, tenure_type, dwelling_type, value)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (geo_code, year, tenure_type, dwelling_type)
             DO UPDATE SET value = $5`,
            [geoCode, year, tenureType, dwellingType, value],
          );
          inserted++;
          break;
        }
        case 'woningtekort': {
          const geoCode = String(row.geo_code || row.geoCode);
          const year = Number(row.year);
          const metric = String(row.metric);
          const value = Number(row.value);

          if (!geoCode || isNaN(year) || !metric || isNaN(value)) continue;

          await client.query(
            `INSERT INTO data_woningtekort (geo_code, year, metric, value)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (geo_code, year, metric)
             DO UPDATE SET value = $4`,
            [geoCode, year, metric, value],
          );
          inserted++;
          break;
        }
      }
    }

    await client.query('COMMIT');

    // Update import record
    await query(
      `UPDATE data_imports SET status = 'completed', row_count = $1, completed_at = NOW() WHERE id = $2`,
      [inserted, importId],
    );

    res.json({
      importId,
      source,
      totalRows: data.length,
      insertedRows: inserted,
      skippedRows: data.length - inserted,
    });
  } catch (err) {
    await client.query('ROLLBACK');

    await query(
      `UPDATE data_imports SET status = 'failed', error_message = $1 WHERE id = $2`,
      [err instanceof Error ? err.message : 'Unknown error', importId],
    );

    res.status(500).json({ error: 'Import failed', importId });
  } finally {
    client.release();
  }
}

export async function getImportHistory(req: Request, res: Response): Promise<void> {
  const result = await query(
    `SELECT di.*, u.name as user_name
     FROM data_imports di
     LEFT JOIN users u ON u.id = di.user_id
     ORDER BY di.created_at DESC
     LIMIT 50`,
  );

  res.json({
    imports: result.rows.map(r => ({
      id: r.id,
      userName: r.user_name,
      source: r.source,
      filename: r.filename,
      rowCount: r.row_count,
      status: r.status,
      errorMessage: r.error_message,
      createdAt: r.created_at,
      completedAt: r.completed_at,
    })),
  });
}
