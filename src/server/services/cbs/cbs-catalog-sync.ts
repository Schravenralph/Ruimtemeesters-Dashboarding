/**
 * CBS StatLine Catalog Sync
 *
 * Fetches the full CBS table catalog (~5,900 tables) and caches it locally.
 * Uses the v3 OData catalog which has richer metadata than v4.
 *
 * Catalog endpoint: https://opendata.cbs.nl/ODataCatalog/Tables
 * Themes endpoint:  https://opendata.cbs.nl/ODataCatalog/Themes
 * Junction:         https://opendata.cbs.nl/ODataCatalog/Tables_Themes
 */

import { getClient, query } from '../../db/pool.js';

const CATALOG_BASE = 'https://opendata.cbs.nl/ODataCatalog';
const PAGE_SIZE = 500;

interface CbsCatalogEntry {
  Identifier: string;
  Title: string;
  ShortTitle: string;
  Summary: string;
  Frequency: string;
  Period: string;
  Modified: string;
  RecordCount: number;
  ColumnCount: number;
  GraphTypes: string;
  ApiUrl: string;
}

interface CbsTheme {
  ID: number;
  Title: string;
  ParentID: number | null;
}

interface CbsTableTheme {
  TableIdentifier: string;
  ThemeID: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`CBS catalog fetch failed: ${response.status} ${url}`);
  return response.json() as Promise<T>;
}

/**
 * Fetch all pages from a CBS OData v3 endpoint.
 */
async function fetchAllPages<T>(baseUrl: string): Promise<T[]> {
  const all: T[] = [];
  let skip = 0;

  while (true) {
    const url = `${baseUrl}?$format=json&$top=${PAGE_SIZE}&$skip=${skip}`;
    const data = await fetchJson<{ value: T[] }>(url);
    if (!data.value || data.value.length === 0) break;
    all.push(...data.value);
    if (data.value.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  return all;
}

/**
 * Sync the full CBS catalog into cbs_catalog table.
 * Fetches tables, themes, and the junction table to build theme arrays.
 */
export async function syncCbsCatalog(): Promise<{
  tablesProcessed: number;
  themesLoaded: number;
  duration: number;
  errors: string[];
}> {
  const startTime = Date.now();
  const errors: string[] = [];

  console.log('[CBS Catalog] Fetching tables...');
  const tables = await fetchAllPages<CbsCatalogEntry>(`${CATALOG_BASE}/Tables`);
  console.log(`[CBS Catalog] ${tables.length} tables fetched`);

  console.log('[CBS Catalog] Fetching themes...');
  const themes = await fetchAllPages<CbsTheme>(`${CATALOG_BASE}/Themes`);
  const themeMap = new Map(themes.map(t => [t.ID, t.Title]));
  console.log(`[CBS Catalog] ${themes.length} themes fetched`);

  console.log('[CBS Catalog] Fetching table-theme junction...');
  const junctions = await fetchAllPages<CbsTableTheme>(`${CATALOG_BASE}/Tables_Themes`);
  console.log(`[CBS Catalog] ${junctions.length} junction entries fetched`);

  // Build theme arrays per table
  const tableThemes = new Map<string, string[]>();
  for (const j of junctions) {
    const themeName = themeMap.get(j.ThemeID);
    if (!themeName) continue;
    const existing = tableThemes.get(j.TableIdentifier) || [];
    existing.push(themeName);
    tableThemes.set(j.TableIdentifier, existing);
  }

  // Upsert into database — use savepoints so one bad row doesn't kill the batch
  const client = await getClient();
  let inserted = 0;
  try {
    await client.query('BEGIN');
    const now = new Date().toISOString();

    for (const table of tables) {
      try {
        // Parse modified date safely
        let modified: Date | null = null;
        if (table.Modified) {
          const parsed = new Date(table.Modified);
          if (!isNaN(parsed.getTime())) modified = parsed;
        }

        await client.query('SAVEPOINT sp');
        await client.query(`
          INSERT INTO cbs_catalog (
            identifier, title, short_title, summary, frequency, period,
            record_count, column_count, modified, graph_types, api_url,
            themes, catalog_synced_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (identifier) DO UPDATE SET
            title = EXCLUDED.title,
            short_title = EXCLUDED.short_title,
            summary = EXCLUDED.summary,
            frequency = EXCLUDED.frequency,
            period = EXCLUDED.period,
            record_count = EXCLUDED.record_count,
            column_count = EXCLUDED.column_count,
            modified = EXCLUDED.modified,
            graph_types = EXCLUDED.graph_types,
            api_url = EXCLUDED.api_url,
            themes = EXCLUDED.themes,
            catalog_synced_at = EXCLUDED.catalog_synced_at
        `, [
          table.Identifier,
          table.Title || 'Untitled',
          table.ShortTitle || null,
          table.Summary || null,
          table.Frequency || null,
          table.Period || null,
          table.RecordCount ?? null,
          table.ColumnCount ?? null,
          modified,
          table.GraphTypes || null,
          table.ApiUrl || null,
          tableThemes.get(table.Identifier) || [],
          now,
        ]);
        await client.query('RELEASE SAVEPOINT sp');
        inserted++;
      } catch (err) {
        await client.query('ROLLBACK TO SAVEPOINT sp');
        errors.push(`${table.Identifier}: ${err instanceof Error ? err.message : 'unknown'}`);
      }
    }

    // Track last sync time
    await client.query(`
      INSERT INTO system_state (key, value, updated_at)
      VALUES ('cbs_catalog_sync', $1, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `, [JSON.stringify({ tables: inserted, themes: themes.length, at: now })]);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    errors.push(err instanceof Error ? err.message : 'Transaction failed');
  } finally {
    client.release();
  }

  const duration = Date.now() - startTime;
  console.log(`[CBS Catalog] Sync complete: ${tables.length} tables, ${themes.length} themes in ${(duration / 1000).toFixed(1)}s`);

  return {
    tablesProcessed: tables.length,
    themesLoaded: themes.length,
    duration,
    errors,
  };
}

/**
 * Search the local CBS catalog cache.
 */
export async function searchCatalog(options: {
  search?: string;
  theme?: string;
  frequency?: string;
  activated?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{
  tables: Array<{
    identifier: string;
    title: string;
    shortTitle: string;
    summary: string;
    frequency: string;
    period: string;
    recordCount: number;
    modified: string;
    themes: string[];
    isActivated: boolean;
    dataSourceKey: string | null;
    relevance: number;
  }>;
  total: number;
}> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  // Search — BM25-style ranking via ts_rank_cd when the query is substantial,
  // trigram similarity for short/partial queries (still-typing case).
  // We build both a WHERE condition and a rank expression in one pass.
  // rankExpr is only read when rawSearch is truthy; when no search term is
  // supplied, the SELECT falls back to '0' and ORDER BY uses record_count.
  let rankExpr = '';
  const rawSearch = options.search?.trim();
  const useFts = !!rawSearch && rawSearch.length >= 3;

  // Both branches use a single parameter so the count query (which reuses the
  // same params array but without the rank expression) doesn't receive extra
  // binds. ILIKE uses inline '%' concatenation to reuse the raw-term param.
  if (rawSearch) {
    if (useFts) {
      conditions.push(
        `(search_vector @@ websearch_to_tsquery('dutch', unaccent($${idx})) ` +
        `OR title ILIKE '%' || $${idx} || '%' OR identifier ILIKE '%' || $${idx} || '%')`,
      );
      rankExpr = `ts_rank_cd(search_vector, websearch_to_tsquery('dutch', unaccent($${idx})))`;
      params.push(rawSearch);
      idx += 1;
    } else {
      // Short query: fall back to trigram/ILIKE for responsiveness.
      conditions.push(
        `(title ILIKE '%' || $${idx} || '%' OR identifier ILIKE '%' || $${idx} || '%' OR short_title ILIKE '%' || $${idx} || '%')`,
      );
      rankExpr = `similarity(title, $${idx})`;
      params.push(rawSearch);
      idx += 1;
    }
  }

  if (options.theme) {
    conditions.push(`$${idx} = ANY(themes)`);
    params.push(options.theme);
    idx++;
  }

  if (options.frequency) {
    conditions.push(`frequency = $${idx}`);
    params.push(options.frequency);
    idx++;
  }

  if (options.activated !== undefined) {
    conditions.push(`is_activated = $${idx}`);
    params.push(options.activated);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(options.limit || 50, 200);
  const offset = options.offset || 0;

  // Without a search query, rank is always 0 — preserve the prior behaviour
  // (sort by record_count DESC) so the default browse view is stable.
  const orderBy = rawSearch
    ? `${rankExpr} DESC, record_count DESC NULLS LAST`
    : 'record_count DESC NULLS LAST';

  const [dataResult, countResult] = await Promise.all([
    query(`
      SELECT identifier, title, short_title, summary, frequency, period,
             record_count, modified, themes, is_activated, data_source_key,
             ${rawSearch ? rankExpr : '0'}::real AS relevance
      FROM cbs_catalog ${where}
      ORDER BY ${orderBy}
      LIMIT ${limit} OFFSET ${offset}
    `, params),
    query(`SELECT COUNT(*) as total FROM cbs_catalog ${where}`, params),
  ]);

  return {
    tables: dataResult.rows.map(r => ({
      identifier: r.identifier,
      title: r.title,
      shortTitle: r.short_title,
      summary: r.summary,
      frequency: r.frequency,
      period: r.period,
      recordCount: r.record_count,
      modified: r.modified,
      themes: r.themes,
      isActivated: r.is_activated,
      dataSourceKey: r.data_source_key,
      relevance: typeof r.relevance === 'number' ? r.relevance : Number(r.relevance ?? 0),
    })),
    total: parseInt(countResult.rows[0].total),
  };
}

/**
 * Get CBS catalog themes (distinct theme names from cached data).
 */
export async function getCatalogThemes(): Promise<string[]> {
  const result = await query(`
    SELECT DISTINCT unnest(themes) as theme FROM cbs_catalog ORDER BY theme
  `);
  return result.rows.map(r => r.theme);
}
