/**
 * CBS Catalogue Metadata Inspector.
 *
 * For every table in `cbs_catalog`, fetches its dimensions, dimension codes,
 * measures, and derives a geo/period profile. Writes a JSONB blob to
 * `cbs_catalog.metadata` so downstream UI can operate on real shapes.
 *
 * Endpoints used (CBS v4 OData):
 *   /{id}/Dimensions                — dimension list + Kind
 *   /{id}/{Dim}Codes                — codes (Identifier, Title, DimensionGroupId)
 *   /{id}/MeasureCodes              — measures (Identifier, Title, Unit, Decimals)
 *   /{id}/MeasureGroups             — measure group hierarchy
 *
 * Inspection is idempotent and resumable: failures are recorded and a re-run
 * retries them.
 */
import { query } from '../../db/pool.js';

const CBS_V4_BASE = 'https://datasets.cbs.nl/odata/v1/CBS';
const FETCH_TIMEOUT_MS = 20_000;
const FETCH_RETRY = 3;

// Hard cap on codes we persist per dimension. Some dims (RegioS, Postcode)
// have thousands of values — we still count them all, but only materialise
// the first N in dimensionValues to keep the JSONB blob bounded.
const MAX_CODES_PER_DIM = 500;

// Safety cap on pagination loops when fetching a dimension's full code list
// for counting/geo-profiling. CBS default page size is 10k; 20 pages covers
// ~200k codes, far beyond any real CBS dimension.
const MAX_CODE_PAGES = 20;

interface ODataWrapper<T> { value: T[]; '@odata.nextLink'?: string }

interface RawDimension {
  Identifier: string;
  Title: string;
  Kind: 'Dimension' | 'TimeDimension' | 'GeoDimension' | string;
  ContainsGroups: boolean;
  ContainsCodes: boolean;
  CodesUrl: string | null;
  GroupsUrl: string | null;
}

interface RawCode {
  Identifier: string;
  Index: number;
  Title: string;
  Description?: string;
  DimensionGroupId?: string | null;
}

interface RawMeasure {
  Identifier: string;
  Title: string;
  Description?: string;
  MeasureGroupId?: number | null;
  Unit?: string;
  Decimals?: number;
  DataType?: string;
}

interface RawMeasureGroup {
  Id: number;
  Title: string;
  ParentId?: number | null;
}

export type GeoLevel =
  | 'land' | 'landsdeel' | 'provincie' | 'corop'
  | 'gemeente' | 'wijk' | 'buurt' | 'postcode4' | 'postcode6';

export interface DimensionSummary {
  name: string;
  title: string;
  kind: 'Dimension' | 'TimeDimension' | 'GeoDimension';
  valueCount: number;
  hasTotal: boolean;
  totalId?: string;
  // Populated only for geo-like dimensions
  geoLevels?: GeoLevel[];
  // Populated only for time dimensions
  min?: number;
  max?: number;
}

export interface DimensionValue {
  id: string;
  title: string;
  group: string | null;
}

export interface MeasureSummary {
  id: string;
  title: string;
  unit: string | null;
  decimals: number | null;
  group: string | null;
}

export interface CatalogueTableMetadata {
  dimensions: DimensionSummary[];
  dimensionValues: Record<string, DimensionValue[]>;
  measures: MeasureSummary[];
  geoLevels: GeoLevel[];
  periodRange: { min: number; max: number } | null;
  recommendedDefaults: {
    measure: string | null;
    regionDim: string | null;
    totalDimValues: Record<string, string>;
  };
  inspectedAt: string;
  /** Parts of the metadata we couldn't fetch fully. Callers that rely on
   *  exhaustive measure/dimension-value lists should treat a non-empty array
   *  as a signal to re-inspect. `inspection_status = 'partial'` is set when
   *  any field is populated. */
  missing: {
    measures: boolean;
    measureGroups: boolean;
    dimensions: string[];
  };
  truncated: { dimensions: string[] };
}

export interface InspectOptions {
  concurrency?: number;
  onlyStale?: boolean;
  limit?: number;
  identifiers?: string[];
  onProgress?: (done: number, total: number, current: string) => void;
}

export interface InspectSummary {
  total: number;
  ok: number;
  error: number;
  partial: number;
  durationMs: number;
  errors: Array<{ identifier: string; error: string }>;
}

/** Common CBS region code prefixes and the level they represent. */
const REGION_PREFIXES: Array<{ match: RegExp; level: GeoLevel }> = [
  { match: /^NL\d{2}$/, level: 'land' },
  { match: /^LD\d{2}$/, level: 'landsdeel' },
  { match: /^PV\d{2}$/, level: 'provincie' },
  { match: /^CR\d{2}$/, level: 'corop' },
  { match: /^GM\d{4}$/, level: 'gemeente' },
  { match: /^WK\d{6}$/, level: 'wijk' },
  { match: /^BU\d{8}$/, level: 'buurt' },
  { match: /^PC\d{4}$/, level: 'postcode4' },
  { match: /^\d{4}$/, level: 'postcode4' },
  { match: /^PC\d{4}[A-Z]{2}$/i, level: 'postcode6' },
  { match: /^\d{4}[A-Z]{2}$/i, level: 'postcode6' },
];

/** Names that typically indicate a region dimension even when Kind !== 'GeoDimension'. */
const GEO_DIM_NAMES = new Set([
  'regios', 'postcode', 'gemeente', 'provincie', 'wijkenenbuurten',
  'wijken', 'buurten', 'regio', 'wijkenbuurten', 'postcodes',
]);

/** Fetch a JSON endpoint with retry + timeout. */
async function fetchJson<T>(url: string): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < FETCH_RETRY; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
      return await res.json() as T;
    } catch (err) {
      lastErr = err;
      if (attempt < FETCH_RETRY - 1) {
        await new Promise(r => setTimeout(r, 500 * 2 ** attempt));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('fetch failed');
}

/** Fetch all pages of an OData collection, capped by MAX_CODE_PAGES. */
async function fetchAllPages<T>(url: string, maxPages = MAX_CODE_PAGES): Promise<T[]> {
  const out: T[] = [];
  let next: string | undefined = url.includes('$format=') ? url : `${url}${url.includes('?') ? '&' : '?'}$format=json`;
  let page = 0;
  while (next && page < maxPages) {
    const data: ODataWrapper<T> = await fetchJson<ODataWrapper<T>>(next);
    out.push(...(data.value || []));
    next = data['@odata.nextLink'];
    page++;
  }
  return out;
}

/** Infer the geo levels present among a set of region-dim codes. */
export function inferGeoLevels(codes: Array<{ Identifier: string }>): GeoLevel[] {
  const levels = new Set<GeoLevel>();
  for (const c of codes) {
    const id = (c.Identifier || '').trim();
    for (const { match, level } of REGION_PREFIXES) {
      if (match.test(id)) { levels.add(level); break; }
    }
  }
  return Array.from(levels);
}

/** Guess whether a dimension represents a geographic region. */
function isGeoLike(dim: RawDimension): boolean {
  if (dim.Kind === 'GeoDimension') return true;
  return GEO_DIM_NAMES.has(dim.Identifier.toLowerCase());
}

/** Pick the "Totaal" code for a dimension if one is obvious. */
function findTotalId(codes: RawCode[]): string | undefined {
  // CBS conventionally uses 'T' prefix for totals (T001038 "Totaal mannen en vrouwen")
  // and Index=1. Prefer explicit "Totaal" in Title, then T-prefix, then Index=1.
  const byTitle = codes.find(c => /^totaal\b/i.test(c.Title || ''));
  if (byTitle) return byTitle.Identifier;
  const byTPrefix = codes.find(c => /^T\d/.test(c.Identifier));
  if (byTPrefix) return byTPrefix.Identifier;
  return undefined;
}

/** Extract a numeric year from a CBS Perioden identifier, e.g. "2024JJ00". */
function parsePeriodYear(id: string): number | null {
  const m = id.match(/^(\d{4})/);
  return m ? parseInt(m[1], 10) : null;
}

/** Core: inspect one CBS table, return metadata blob. */
export async function inspectOne(identifier: string): Promise<CatalogueTableMetadata> {
  const dims = await fetchJson<ODataWrapper<RawDimension>>(
    `${CBS_V4_BASE}/${identifier}/Dimensions?$format=json`,
  );

  // Measures and measure-groups can transiently fail (CBS sporadically 500s
  // on /MeasureCodes under load). We tolerate empty results but track whether
  // the empty-ness is genuine or a fetch failure so the persisted status can
  // be 'partial' instead of silently 'ok'.
  //
  // IMPORTANT: CBS returns 404 on /MeasureGroups for tables that have no
  // group hierarchy (common — most simple tables). 404 means "empty by
  // design," not "fetch failed." Only non-404 errors should count as missing.
  const isFetchFailure = (err: unknown): boolean => {
    const msg = err instanceof Error ? err.message : String(err);
    return !/HTTP 404 /.test(msg);
  };
  let measuresMissing = false;
  let measureGroupsMissing = false;
  const dimensionsMissing: string[] = [];

  const measuresRaw = await fetchJson<ODataWrapper<RawMeasure>>(
    `${CBS_V4_BASE}/${identifier}/MeasureCodes?$format=json`,
  ).catch((err) => { if (isFetchFailure(err)) measuresMissing = true; return { value: [] as RawMeasure[] }; });

  const measureGroupsRaw = await fetchJson<ODataWrapper<RawMeasureGroup>>(
    `${CBS_V4_BASE}/${identifier}/MeasureGroups?$format=json`,
  ).catch((err) => { if (isFetchFailure(err)) measureGroupsMissing = true; return { value: [] as RawMeasureGroup[] }; });
  const measureGroupMap = new Map(measureGroupsRaw.value.map(g => [g.Id, g.Title]));

  const dimensionValues: Record<string, DimensionValue[]> = {};
  const dimensions: DimensionSummary[] = [];
  const truncated: string[] = [];
  const totalDimValues: Record<string, string> = {};
  let regionDim: string | null = null;
  let periodRange: { min: number; max: number } | null = null;
  const geoLevels = new Set<GeoLevel>();

  for (const dim of dims.value) {
    if (!dim.CodesUrl) continue;
    let codes: RawCode[];
    try {
      codes = await fetchAllPages<RawCode>(dim.CodesUrl);
    } catch (err) {
      // 404 = genuinely empty dim; other errors = fetch failure (track it).
      // Either way we record a minimal summary so downstream consumers see
      // the dim in the list.
      if (isFetchFailure(err)) dimensionsMissing.push(dim.Identifier);
      dimensions.push({
        name: dim.Identifier,
        title: (dim.Title || dim.Identifier).trim(),
        kind: dim.Kind === 'GeoDimension' || dim.Kind === 'TimeDimension' ? dim.Kind : 'Dimension',
        valueCount: 0,
        hasTotal: false,
      });
      dimensionValues[dim.Identifier] = [];
      continue;
    }
    const valueCount = codes.length;
    const total = findTotalId(codes);
    if (total) totalDimValues[dim.Identifier] = total;

    const summary: DimensionSummary = {
      name: dim.Identifier,
      title: (dim.Title || dim.Identifier).trim(),
      kind: dim.Kind === 'GeoDimension' || dim.Kind === 'TimeDimension' ? dim.Kind : 'Dimension',
      valueCount,
      hasTotal: !!total,
      totalId: total,
    };

    if (isGeoLike(dim)) {
      summary.kind = 'GeoDimension';
      summary.geoLevels = inferGeoLevels(codes);
      for (const lvl of summary.geoLevels) geoLevels.add(lvl);
      if (!regionDim) regionDim = dim.Identifier;
    }

    if (dim.Kind === 'TimeDimension' || dim.Identifier === 'Perioden') {
      summary.kind = 'TimeDimension';
      let min = Infinity, max = -Infinity;
      for (const c of codes) {
        const y = parsePeriodYear(c.Identifier);
        if (y != null) { if (y < min) min = y; if (y > max) max = y; }
      }
      if (isFinite(min) && isFinite(max)) {
        summary.min = min;
        summary.max = max;
        periodRange = { min, max };
      }
    }

    dimensions.push(summary);

    const persisted = codes.slice(0, MAX_CODES_PER_DIM).map(c => ({
      id: c.Identifier,
      title: (c.Title || c.Identifier).trim(),
      group: c.DimensionGroupId ?? null,
    }));
    dimensionValues[dim.Identifier] = persisted;
    if (codes.length > MAX_CODES_PER_DIM) truncated.push(dim.Identifier);
  }

  const measures: MeasureSummary[] = measuresRaw.value.map(m => ({
    id: m.Identifier,
    title: (m.Title || m.Identifier).trim(),
    unit: m.Unit ?? null,
    decimals: typeof m.Decimals === 'number' ? m.Decimals : null,
    group: m.MeasureGroupId != null ? (measureGroupMap.get(m.MeasureGroupId) ?? null) : null,
  }));

  // Recommended default measure: prefer one with group "Totalen" or title starting with "Totaal",
  // else the first measure.
  const defaultMeasure =
    measures.find(m => /^totaal/i.test(m.title))?.id
    ?? measures.find(m => m.group && /^totalen?$/i.test(m.group))?.id
    ?? measures[0]?.id
    ?? null;

  return {
    dimensions,
    dimensionValues,
    measures,
    geoLevels: Array.from(geoLevels),
    periodRange,
    recommendedDefaults: {
      measure: defaultMeasure,
      regionDim,
      totalDimValues,
    },
    inspectedAt: new Date().toISOString(),
    missing: {
      measures: measuresMissing,
      measureGroups: measureGroupsMissing,
      dimensions: dimensionsMissing,
    },
    truncated: { dimensions: truncated },
  };
}

/** True when any fetched sub-resource failed and the metadata is incomplete. */
function isPartial(m: CatalogueTableMetadata): boolean {
  return m.missing.measures || m.missing.measureGroups || m.missing.dimensions.length > 0;
}

/** Persist metadata (or error) for one catalogue row. */
async function persistOne(
  identifier: string,
  result: { ok: true; metadata: CatalogueTableMetadata }
           | { ok: false; error: string },
) {
  if (result.ok) {
    const partial = isPartial(result.metadata);
    const note = partial
      ? [
          result.metadata.missing.measures ? 'measures' : null,
          result.metadata.missing.measureGroups ? 'measureGroups' : null,
          result.metadata.missing.dimensions.length
            ? `dims:${result.metadata.missing.dimensions.join(',')}`
            : null,
        ].filter(Boolean).join(' | ')
      : null;
    await query(
      `UPDATE cbs_catalog
         SET metadata = $2, inspected_at = NOW(),
             inspection_status = $3, inspection_error = $4
       WHERE identifier = $1`,
      [identifier, result.metadata, partial ? 'partial' : 'ok', note],
    );
  } else {
    await query(
      `UPDATE cbs_catalog
         SET inspected_at = NOW(), inspection_status = 'error', inspection_error = $2
       WHERE identifier = $1`,
      [identifier, result.error.slice(0, 4000)],
    );
  }
}

/**
 * Run inspector over a set of catalogue rows with bounded concurrency.
 * Returns a summary; per-row errors are persisted on cbs_catalog, not thrown.
 */
export async function inspectAll(options: InspectOptions = {}): Promise<InspectSummary> {
  const started = Date.now();
  const concurrency = Math.max(1, Math.min(32, options.concurrency ?? 8));

  const rows = await selectTargets(options);
  const total = rows.length;
  const errors: InspectSummary['errors'] = [];
  let ok = 0, error = 0, partial = 0, done = 0;

  // Tiny inline concurrency pool so we don't add a dep.
  const queue = rows.slice();
  async function worker() {
    while (queue.length > 0) {
      const row = queue.shift();
      if (!row) break;
      const id = row.identifier;
      try {
        const metadata = await inspectOne(id);
        await persistOne(id, { ok: true, metadata });
        if (isPartial(metadata)) partial++;
        else ok++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await persistOne(id, { ok: false, error: msg }).catch(() => { /* swallow */ });
        error++;
        errors.push({ identifier: id, error: msg });
      } finally {
        done++;
        options.onProgress?.(done, total, id);
      }
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker());
  await Promise.all(workers);

  return { total, ok, error, partial, durationMs: Date.now() - started, errors };
}

async function selectTargets(options: InspectOptions): Promise<Array<{ identifier: string }>> {
  if (options.identifiers?.length) {
    const r = await query<{ identifier: string }>(
      `SELECT identifier FROM cbs_catalog WHERE identifier = ANY($1)`,
      [options.identifiers],
    );
    return r.rows;
  }
  const clauses: string[] = [];
  if (options.onlyStale) {
    // Re-inspect when CBS says the table was modified after our last
    // inspection, or when we have never inspected it.
    clauses.push(`(inspection_status IS NULL
                   OR inspection_status = 'error'
                   OR (modified IS NOT NULL AND inspected_at IS NOT NULL
                       AND modified > inspected_at))`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const lim = options.limit ? `LIMIT ${Math.max(1, options.limit | 0)}` : '';
  const r = await query<{ identifier: string }>(
    `SELECT identifier FROM cbs_catalog ${where} ORDER BY identifier ${lim}`,
  );
  return r.rows;
}
