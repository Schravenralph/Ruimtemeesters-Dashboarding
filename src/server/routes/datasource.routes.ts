import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { getDataSourceStats } from '../controllers/datasource.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { query } from '../db/pool.js';

const router: RouterType = Router();

router.get('/stats', authenticate, requireRole('admin'), getDataSourceStats);

/**
 * GET /api/datasources/attribution
 *
 * Source attribution metadata each tile needs to render its provenance
 * footer: CBS table id + title + statline URL + last successful sync.
 * Returns ALL sources in one cacheable response — tile footers look up
 * by source-key.
 *
 * EPIC #146 child #148.
 */
router.get('/attribution', authenticate, async (_req: Request, res: Response): Promise<void> => {
  const result = await query<{
    key: string; name: string; supercategory: string;
    cbs_table_id: string | null; cbs_table_title: string | null;
    last_sync_at: Date | null;
    cbs_modified: Date | null;
  }>(`
    SELECT
      ds.key, ds.name, ds.supercategory, ds.cbs_table_id,
      cc.title AS cbs_table_title,
      cc.modified AS cbs_modified,
      (SELECT MAX(finished_at) FROM sync_runs sr
        WHERE sr.data_source_key = ds.key AND sr.status IN ('success', 'partial')
      ) AS last_sync_at
    FROM data_sources ds
    LEFT JOIN cbs_catalog cc ON cc.identifier = ds.cbs_table_id
    ORDER BY ds.supercategory, ds.sort_order
  `);

  // The tile footer shows lastSyncAt ("Bijgewerkt") when we have a recorded
  // sync run; falls back to cbsModified ("CBS publicatie") so a source that
  // was seeded before sync-run tracking still shows *something* meaningful
  // instead of a missing freshness line.
  res.json({
    sources: result.rows.map(r => ({
      key: r.key,
      name: r.name,
      supercategory: r.supercategory,
      cbsTableId: r.cbs_table_id,
      cbsTableTitle: r.cbs_table_title,
      lastSyncAt: r.last_sync_at,
      cbsModified: r.cbs_modified,
      statlineUrl: r.cbs_table_id
        ? `https://opendata.cbs.nl/statline/#/CBS/nl/dataset/${r.cbs_table_id}/table`
        : null,
    })),
  });
});

export default router;
