/**
 * Cohort Sync Service.
 *
 * Builds the membership rows in `cohort_definitions` + `cohort_members` for
 * per-municipality referential drilldown (ADR-003).
 *
 * Three cohort types in v1:
 *   - 'stedelijkheid'      → CBS table 86247NED (Gebieden in Nederland 2026)
 *   - 'woningmarktregio'   → same CBS table, statutory 19 ABF/BZK woningmarktregio's
 *   - 'populatiegrootte'   → derived from our local data_bevolking (no CBS call)
 *
 * Plus a 4th optional cohort_type 'krimp_anticipeer' from a hand-curated 2019 mapping CSV
 * (loader implemented; CSV authoring deferred to a follow-up cycle).
 *
 * Attribution: Bron: CBS, StatLine. Licentie: CC-BY 4.0.
 *
 * SPEC: docs/superpowers/specs/2026-05-09-cohort-referential-data-design.md
 */

import { readFileSync, existsSync } from 'fs';
import { getClient, query } from '../../db/pool.js';
import { cbsFetch } from '../cbs/cbs-client.js';

export interface CohortSyncResult {
  cohortType: string;
  definitionsUpserted: number;
  membersUpserted: number;
  errors: string[];
  durationMs: number;
}

const CBS_BASE = 'https://datasets.cbs.nl/odata/v1/CBS';
const GEBIEDEN_TABLE = '86247NED';                 // Gebieden in Nederland 2026
const GEBIEDEN_URL = `${CBS_BASE}/${GEBIEDEN_TABLE}`;
const GEBIEDEN_PAGE = `https://www.cbs.nl/nl-nl/cijfers/detail/${GEBIEDEN_TABLE}`;

// CBS column / dimension name candidates. CBS occasionally renames; we probe at runtime.
const STEDELIJKHEID_FIELDS = ['Stedelijkheid', 'MateVanStedelijkheid', 'StedelijkheidGebied'];
const WMR_FIELDS = ['Woningmarktregio', 'WoningmarktregioStatutair', 'Woningmarktregios'];
const REGIO_FIELD = 'RegioS';

const STEDELIJKHEID_LABELS: Record<string, string> = {
  '1': 'Zeer sterk stedelijk',
  '2': 'Sterk stedelijk',
  '3': 'Matig stedelijk',
  '4': 'Weinig stedelijk',
  '5': 'Niet stedelijk',
};

const POPGROOTTE_BINS: Array<{ key: string; name: string; min: number; max: number }> = [
  { key: 'popbin_lt_20k',    name: '< 20.000 inwoners',           min: 0,      max: 20000 },
  { key: 'popbin_20_50k',    name: '20.000 – 50.000 inwoners',    min: 20000,  max: 50000 },
  { key: 'popbin_50_100k',   name: '50.000 – 100.000 inwoners',   min: 50000,  max: 100000 },
  { key: 'popbin_100_250k',  name: '100.000 – 250.000 inwoners',  min: 100000, max: 250000 },
  { key: 'popbin_g4',        name: 'G4 (≥ 250.000 inwoners)',     min: 250000, max: Number.POSITIVE_INFINITY },
];

const G4_CODES = new Set(['GM0363', 'GM0599', 'GM0518', 'GM0344']); // Amsterdam, Rotterdam, Den Haag, Utrecht

interface GebiedenRow {
  [key: string]: unknown;
  RegioS?: string;
}

function findField(row: GebiedenRow, candidates: readonly string[]): string | null {
  for (const c of candidates) {
    if (c in row) return c;
  }
  return null;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
}

/**
 * Sync stedelijkheid + woningmarktregio cohorts from CBS Gebieden in Nederland.
 * Requires network access to datasets.cbs.nl.
 */
export async function syncCohortsFromCbsGebieden(): Promise<CohortSyncResult[]> {
  const start = Date.now();
  const stedResult: CohortSyncResult = { cohortType: 'stedelijkheid', definitionsUpserted: 0, membersUpserted: 0, errors: [], durationMs: 0 };
  const wmrResult: CohortSyncResult = { cohortType: 'woningmarktregio', definitionsUpserted: 0, membersUpserted: 0, errors: [], durationMs: 0 };

  let rows: GebiedenRow[] = [];
  try {
    // CBS OData v4 returns regions in the Observations table for this code.
    rows = await cbsFetch<GebiedenRow>(`${GEBIEDEN_URL}/Observations`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    stedResult.errors.push(`CBS fetch failed: ${msg}`);
    wmrResult.errors.push(`CBS fetch failed: ${msg}`);
    stedResult.durationMs = Date.now() - start;
    wmrResult.durationMs = Date.now() - start;
    return [stedResult, wmrResult];
  }

  // Detect column names live (CBS occasionally renames between vintages).
  const sample = rows[0] ?? {};
  const stedField = findField(sample, STEDELIJKHEID_FIELDS);
  const wmrField = findField(sample, WMR_FIELDS);

  if (!stedField) {
    stedResult.errors.push(`No Stedelijkheid column found in 86247NED. Available: ${Object.keys(sample).join(', ')}`);
  }
  if (!wmrField) {
    wmrResult.errors.push(`No Woningmarktregio column found in 86247NED. Available: ${Object.keys(sample).join(', ')}`);
  }

  // Collect (geo_code, stedelijkheid, woningmarktregio) per gemeente.
  const stedByGeo = new Map<string, string>();
  const wmrByGeo = new Map<string, string>();

  for (const row of rows) {
    const regio = (row[REGIO_FIELD] ?? '').toString().trim();
    if (!regio.startsWith('GM')) continue; // gemeenten only

    if (stedField) {
      const v = row[stedField];
      if (v !== undefined && v !== null && v !== '') stedByGeo.set(regio, v.toString().trim());
    }
    if (wmrField) {
      const v = row[wmrField];
      if (v !== undefined && v !== null && v !== '') wmrByGeo.set(regio, v.toString().trim());
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  // Persist stedelijkheid cohorts.
  if (stedField) {
    const definitions = new Set(stedByGeo.values());
    for (const code of definitions) {
      const name = STEDELIJKHEID_LABELS[code] ?? `Stedelijkheid ${code}`;
      await upsertCohortDefinition({
        cohortType: 'stedelijkheid',
        cohortKey: `stedelijkheid_${code}`,
        name,
        description: 'CBS stedelijkheidsklasse op basis van omgevingsadressendichtheid (1=zeer sterk … 5=niet stedelijk).',
        source: `CBS ${GEBIEDEN_TABLE}`,
        sourceUrl: GEBIEDEN_PAGE,
        sourceVintage: today,
        themeDefaultFor: [],
        sortOrder: parseInt(code, 10) || 0,
      });
      stedResult.definitionsUpserted++;
    }
    for (const [geoCode, code] of stedByGeo) {
      await upsertCohortMember('stedelijkheid', `stedelijkheid_${code}`, geoCode);
      stedResult.membersUpserted++;
    }
  }

  // Persist woningmarktregio cohorts.
  if (wmrField) {
    const definitions = new Set(wmrByGeo.values());
    for (const wmrName of definitions) {
      await upsertCohortDefinition({
        cohortType: 'woningmarktregio',
        cohortKey: `wmr_${slugify(wmrName)}`,
        name: wmrName,
        description: 'Statutaire woningmarktregio (BZK / Woningwet).',
        source: `CBS ${GEBIEDEN_TABLE}`,
        sourceUrl: GEBIEDEN_PAGE,
        sourceVintage: today,
        themeDefaultFor: ['wonen-overzicht', 'wonen-bevolking', 'wonen-huishoudens', 'wonen-woningen', 'wonen-woningtekort'],
        sortOrder: 0,
      });
      wmrResult.definitionsUpserted++;
    }
    for (const [geoCode, wmrName] of wmrByGeo) {
      await upsertCohortMember('woningmarktregio', `wmr_${slugify(wmrName)}`, geoCode);
      wmrResult.membersUpserted++;
    }
  }

  stedResult.durationMs = Date.now() - start;
  wmrResult.durationMs = Date.now() - start;
  return [stedResult, wmrResult];
}

/**
 * Sync population-size cohorts from local data_bevolking (no CBS call).
 * Bins each gemeente by its latest-year total population.
 */
export async function syncPopulatiegrootte(): Promise<CohortSyncResult> {
  const start = Date.now();
  const result: CohortSyncResult = {
    cohortType: 'populatiegrootte',
    definitionsUpserted: 0,
    membersUpserted: 0,
    errors: [],
    durationMs: 0,
  };

  // Latest-year total population per gemeente. We pin every dimension to 'totaal'
  // to get the grand total once per gemeente.
  const popResult = await query<{ geo_code: string; population: string; max_year: number }>(
    `
    SELECT b.geo_code,
           SUM(b.value)::TEXT AS population,
           MAX(b.year) AS max_year
    FROM data_bevolking b
    JOIN geo_areas g ON g.code = b.geo_code
    WHERE g.level = 'gemeente'
      AND b.year = (SELECT MAX(year) FROM data_bevolking WHERE source = 'cbs_actuals')
      AND b.source = 'cbs_actuals'
      AND b.age_group = 'totaal'
      AND b.gender = 'totaal'
    GROUP BY b.geo_code
    `,
  );

  if (popResult.rows.length === 0) {
    result.errors.push('No data_bevolking rows found for latest cbs_actuals year — cannot bin populatiegrootte.');
    result.durationMs = Date.now() - start;
    return result;
  }

  const today = new Date().toISOString().slice(0, 10);
  const sourceVintage = `data_bevolking @ year=${popResult.rows[0]?.max_year}`;

  // Upsert all 5 bin definitions (idempotent).
  for (const bin of POPGROOTTE_BINS) {
    await upsertCohortDefinition({
      cohortType: 'populatiegrootte',
      cohortKey: bin.key,
      name: bin.name,
      description: 'Populatiegrootte-bin op basis van CBS bevolkingscijfer (laatste actuals jaar).',
      source: sourceVintage,
      sourceUrl: 'https://www.cbs.nl/nl-nl/cijfers/detail/03759ned',
      sourceVintage: today,
      themeDefaultFor: ['duurzaamheid-overzicht', 'duurzaamheid-energie', 'duurzaamheid-emissies', 'duurzaamheid-hernieuwbaar', 'duurzaamheid-afval'],
      sortOrder: POPGROOTTE_BINS.indexOf(bin),
    });
    result.definitionsUpserted++;
  }

  for (const row of popResult.rows) {
    let bin = POPGROOTTE_BINS[0];
    if (G4_CODES.has(row.geo_code)) {
      bin = POPGROOTTE_BINS[POPGROOTTE_BINS.length - 1];
    } else {
      const pop = parseFloat(row.population);
      bin = POPGROOTTE_BINS.find(b => pop >= b.min && pop < b.max) ?? POPGROOTTE_BINS[0];
    }
    await upsertCohortMember('populatiegrootte', bin.key, row.geo_code);
    result.membersUpserted++;
  }

  result.durationMs = Date.now() - start;
  return result;
}

/**
 * Sync krimp/anticipeer cohorts from a hand-curated CSV.
 * CSV columns: cohort_key,name,geo_code
 *
 * The 2019 Rijksoverheid mapping is the most recent canonical list (see ADR-003 §References).
 * If the CSV file does not exist, this is a no-op (cohort_type omitted from output).
 */
export async function syncCohortsFromCsv(csvPath: string): Promise<CohortSyncResult> {
  const start = Date.now();
  const result: CohortSyncResult = {
    cohortType: 'krimp_anticipeer',
    definitionsUpserted: 0,
    membersUpserted: 0,
    errors: [],
    durationMs: 0,
  };

  if (!existsSync(csvPath)) {
    result.errors.push(`CSV not found at ${csvPath} — krimp_anticipeer cohort skipped.`);
    result.durationMs = Date.now() - start;
    return result;
  }

  const today = new Date().toISOString().slice(0, 10);
  const text = readFileSync(csvPath, 'utf8');
  const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('#'));
  const header = lines.shift();
  if (!header) {
    result.durationMs = Date.now() - start;
    return result;
  }

  const cols = header.split(',').map(c => c.trim());
  const keyIdx = cols.indexOf('cohort_key');
  const nameIdx = cols.indexOf('name');
  const geoIdx = cols.indexOf('geo_code');
  if (keyIdx < 0 || nameIdx < 0 || geoIdx < 0) {
    result.errors.push(`CSV missing required columns (cohort_key,name,geo_code). Got: ${cols.join(',')}`);
    result.durationMs = Date.now() - start;
    return result;
  }

  const definitionsByKey = new Map<string, string>();
  const memberships: Array<{ key: string; geoCode: string }> = [];

  for (const line of lines) {
    const fields = line.split(',').map(f => f.trim());
    const key = fields[keyIdx];
    const name = fields[nameIdx];
    const geoCode = fields[geoIdx];
    if (!key || !name || !geoCode) continue;
    definitionsByKey.set(key, name);
    memberships.push({ key, geoCode });
  }

  for (const [key, name] of definitionsByKey) {
    await upsertCohortDefinition({
      cohortType: 'krimp_anticipeer',
      cohortKey: key,
      name,
      description: 'Krimp- of anticipeerregio (Rijksoverheid 2019 indeling).',
      source: 'Rijksoverheid 2019 (hand-curated)',
      sourceUrl: 'https://www.rijksoverheid.nl/documenten/publicaties/2019/07/25/indeling-gemeenten-krimpregios-en-anticipeerregios-per-1-januari-2019',
      sourceVintage: '2019-07-25',
      themeDefaultFor: [],
      sortOrder: 0,
    });
    result.definitionsUpserted++;
  }
  for (const m of memberships) {
    try {
      await upsertCohortMember('krimp_anticipeer', m.key, m.geoCode);
      result.membersUpserted++;
    } catch (err) {
      result.errors.push(`upsert ${m.key}/${m.geoCode}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  result.durationMs = Date.now() - start;
  return result;
}

/**
 * Run all cohort syncs. CBS-blocked ones return an error in their result; the run
 * continues (so populatiegrootte etc. still land).
 */
export async function syncAllCohorts(opts: { krimpCsvPath?: string } = {}): Promise<CohortSyncResult[]> {
  const results: CohortSyncResult[] = [];

  // CBS-dependent
  try {
    const cbsResults = await syncCohortsFromCbsGebieden();
    results.push(...cbsResults);
  } catch (err) {
    results.push({
      cohortType: 'cbs_gebieden',
      definitionsUpserted: 0,
      membersUpserted: 0,
      errors: [`Top-level CBS sync error: ${err instanceof Error ? err.message : String(err)}`],
      durationMs: 0,
    });
  }

  // Local-only
  results.push(await syncPopulatiegrootte());

  // Optional CSV
  if (opts.krimpCsvPath) {
    results.push(await syncCohortsFromCsv(opts.krimpCsvPath));
  }

  return results;
}

interface CohortDefinitionInput {
  cohortType: string;
  cohortKey: string;
  name: string;
  description: string | null;
  source: string;
  sourceUrl: string | null;
  sourceVintage: string;
  themeDefaultFor: string[];
  sortOrder: number;
}

async function upsertCohortDefinition(d: CohortDefinitionInput): Promise<void> {
  await query(
    `
    INSERT INTO cohort_definitions
      (cohort_type, cohort_key, name, description, source, source_url, source_vintage, theme_default_for, sort_order)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (cohort_type, cohort_key) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      source = EXCLUDED.source,
      source_url = EXCLUDED.source_url,
      source_vintage = EXCLUDED.source_vintage,
      theme_default_for = EXCLUDED.theme_default_for,
      sort_order = EXCLUDED.sort_order
    `,
    [d.cohortType, d.cohortKey, d.name, d.description, d.source, d.sourceUrl, d.sourceVintage, d.themeDefaultFor, d.sortOrder],
  );
}

async function upsertCohortMember(cohortType: string, cohortKey: string, geoCode: string): Promise<void> {
  await query(
    `
    INSERT INTO cohort_members (cohort_type, cohort_key, geo_code)
    VALUES ($1, $2, $3)
    ON CONFLICT (cohort_type, cohort_key, geo_code) DO NOTHING
    `,
    [cohortType, cohortKey, geoCode],
  );
}

// Re-export internal helpers for tests.
export const _internals = {
  POPGROOTTE_BINS,
  STEDELIJKHEID_LABELS,
  G4_CODES,
  slugify,
  findField,
};
