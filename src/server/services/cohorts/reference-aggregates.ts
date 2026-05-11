/**
 * Reference aggregates for /api/data/query?references=cohort,provincie,land
 *
 * For a focal gemeente, computes mean (and optionally p25/p50/p75 envelope) over
 * three reference scopes:
 *   - cohort:    AVG over the focal's cohort_members (per cohort_type, default per supercategory)
 *   - provincie: AVG over all gemeenten sharing the focal's parent_code
 *   - land:      AVG over all gemeenten in the country
 *
 * All aggregates honour the same dimensional filters as the main query (year, dimension, dataOrigin).
 *
 * SPEC: docs/superpowers/specs/2026-05-09-cohort-referential-data-design.md
 */

import { query } from '../../db/pool.js';
import { safeIdent } from '../../db/sql-utils.js';
import type { ReferencesBlock, ReferenceSeries, SeriesPoint, CohortType } from '../../../shared/api/contracts.js';

export interface DataSourceShape {
  tableName: string;
  valueColumn: string;
  dimensionColumns: string[];
  defaultFilters: Record<string, string> | null;
  supercategory?: string;
}

export interface ReferenceComputeOptions {
  source: DataSourceShape;
  focalGeoCode: string;
  yearFilter?: number;
  dimension?: string;
  dimensionValue?: string;
  dataOrigin?: string;
  references: Array<'cohort' | 'provincie' | 'land'>;
  cohortType?: CohortType;
  envelope?: boolean;
}

const COHORT_DEFAULT_BY_SUPERCATEGORY: Record<string, CohortType> = {
  wonen: 'woningmarktregio',
  duurzaamheid: 'populatiegrootte',
  // future supercategories default here; absent → 'populatiegrootte'
};

function defaultCohortType(supercategory?: string): CohortType {
  if (supercategory && COHORT_DEFAULT_BY_SUPERCATEGORY[supercategory]) {
    return COHORT_DEFAULT_BY_SUPERCATEGORY[supercategory];
  }
  return 'populatiegrootte';
}

function buildDimensionFilter(
  source: DataSourceShape,
  dimension: string | undefined,
  dimensionValue: string | undefined,
  startParamIdx: number,
): { sql: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let pIdx = startParamIdx;
  const constrainedCols = new Set<string>();

  if (dimension && dimensionValue) {
    const dimCol = source.dimensionColumns.find(c => c.replace(/_/g, '') === dimension.replace(/_/g, ''));
    if (dimCol) {
      conditions.push(`d.${safeIdent(dimCol)} = $${pIdx++}`);
      params.push(dimensionValue);
      constrainedCols.add(dimCol);
    }
  }
  // Pin all unconstrained dimensions to 'totaal' to avoid double-counting (matches data.controller convention).
  for (const col of source.dimensionColumns) {
    if (!constrainedCols.has(col) && !(source.defaultFilters && col in source.defaultFilters)) {
      conditions.push(`d.${safeIdent(col)} = 'totaal'`);
    }
  }
  // Apply default filters from registry when not constrained by dimension.
  if (source.defaultFilters) {
    for (const [col, val] of Object.entries(source.defaultFilters)) {
      if (!constrainedCols.has(col)) {
        conditions.push(`d.${safeIdent(col)} = $${pIdx++}`);
        params.push(val);
      }
    }
  }
  return { sql: conditions.join(' AND '), params };
}

async function computeMeanSeries(
  geoCodes: string[],
  source: DataSourceShape,
  yearFilter: number | undefined,
  dimension: string | undefined,
  dimensionValue: string | undefined,
  dataOrigin: string | undefined,
): Promise<SeriesPoint[]> {
  if (geoCodes.length === 0) return [];

  const dimFilter = buildDimensionFilter(source, dimension, dimensionValue, 2);
  const params: unknown[] = [geoCodes, ...dimFilter.params];
  let pIdx = 2 + dimFilter.params.length;

  const conditions: string[] = ['d.geo_code = ANY($1)'];
  if (yearFilter) {
    conditions.push(`d.year = $${pIdx++}`);
    params.push(yearFilter);
  }
  if (dataOrigin) {
    conditions.push(`d.source = $${pIdx++}`);
    params.push(dataOrigin);
  } else {
    // Match the dedup priority of the main query — only consider cbs_actuals here for the reference baseline.
    conditions.push(`d.source = 'cbs_actuals'`);
  }
  if (dimFilter.sql) conditions.push(dimFilter.sql);

  const sql = `
    SELECT d.year, AVG(d.${safeIdent(source.valueColumn)})::FLOAT8 AS value
    FROM ${safeIdent(source.tableName)} d
    WHERE ${conditions.join(' AND ')}
    GROUP BY d.year
    ORDER BY d.year
  `;

  const result = await query<{ year: number; value: number }>(sql, params);
  return result.rows.map(r => ({ year: Number(r.year), value: Number(r.value) }));
}

async function computeEnvelopeSeries(
  geoCodes: string[],
  source: DataSourceShape,
  yearFilter: number | undefined,
  dimension: string | undefined,
  dimensionValue: string | undefined,
  dataOrigin: string | undefined,
): Promise<{ p25: SeriesPoint[]; p50: SeriesPoint[]; p75: SeriesPoint[] } | undefined> {
  if (geoCodes.length === 0) return undefined;

  const dimFilter = buildDimensionFilter(source, dimension, dimensionValue, 2);
  const params: unknown[] = [geoCodes, ...dimFilter.params];
  let pIdx = 2 + dimFilter.params.length;
  const conditions: string[] = ['d.geo_code = ANY($1)'];
  if (yearFilter) { conditions.push(`d.year = $${pIdx++}`); params.push(yearFilter); }
  if (dataOrigin) { conditions.push(`d.source = $${pIdx++}`); params.push(dataOrigin); }
  else { conditions.push(`d.source = 'cbs_actuals'`); }
  if (dimFilter.sql) conditions.push(dimFilter.sql);

  const sql = `
    SELECT d.year,
           PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY d.${safeIdent(source.valueColumn)})::FLOAT8 AS p25,
           PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY d.${safeIdent(source.valueColumn)})::FLOAT8 AS p50,
           PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY d.${safeIdent(source.valueColumn)})::FLOAT8 AS p75
    FROM ${safeIdent(source.tableName)} d
    WHERE ${conditions.join(' AND ')}
    GROUP BY d.year
    ORDER BY d.year
  `;

  const result = await query<{ year: number; p25: number; p50: number; p75: number }>(sql, params);
  return {
    p25: result.rows.map(r => ({ year: Number(r.year), value: Number(r.p25) })),
    p50: result.rows.map(r => ({ year: Number(r.year), value: Number(r.p50) })),
    p75: result.rows.map(r => ({ year: Number(r.year), value: Number(r.p75) })),
  };
}

export async function computeReferences(opts: ReferenceComputeOptions): Promise<ReferencesBlock> {
  const block: ReferencesBlock = {};

  const requested = new Set(opts.references);
  const focalIsGemeente = opts.focalGeoCode.startsWith('GM');

  // Cohort
  if (requested.has('cohort') && focalIsGemeente) {
    const cohortType = opts.cohortType ?? defaultCohortType(opts.source.supercategory);
    const focalCohort = await query<{ cohort_key: string; name: string }>(
      `
      SELECT m.cohort_key, d.name
      FROM cohort_members m
      JOIN cohort_definitions d ON d.cohort_type = m.cohort_type AND d.cohort_key = m.cohort_key
      WHERE m.geo_code = $1 AND m.cohort_type = $2
      `,
      [opts.focalGeoCode, cohortType],
    );
    if (focalCohort.rowCount && focalCohort.rows[0]) {
      const { cohort_key, name } = focalCohort.rows[0];
      const memberRes = await query<{ geo_code: string }>(
        `SELECT geo_code FROM cohort_members WHERE cohort_type = $1 AND cohort_key = $2`,
        [cohortType, cohort_key],
      );
      const memberCodes = memberRes.rows.map(r => r.geo_code);
      const series = await computeMeanSeries(memberCodes, opts.source, opts.yearFilter, opts.dimension, opts.dimensionValue, opts.dataOrigin);
      const ref: ReferenceSeries = {
        kind: 'cohort',
        label: `Cohort: ${name}`,
        series,
      };
      if (opts.envelope) {
        const env = await computeEnvelopeSeries(memberCodes, opts.source, opts.yearFilter, opts.dimension, opts.dimensionValue, opts.dataOrigin);
        if (env) ref.envelope = env;
      }
      block.cohort = ref;
    }
  }

  // Provincie — find focal's parent provincie via geo_areas.parent_code, then average across its child gemeenten.
  if (requested.has('provincie') && focalIsGemeente) {
    const parentRes = await query<{ provincie_code: string; provincie_name: string }>(
      `
      SELECT p.code AS provincie_code, p.name AS provincie_name
      FROM geo_areas g
      JOIN geo_areas p ON p.code = g.parent_code AND p.level = 'provincie'
      WHERE g.code = $1
      `,
      [opts.focalGeoCode],
    );
    if (parentRes.rowCount && parentRes.rows[0]) {
      const { provincie_code, provincie_name } = parentRes.rows[0];
      const siblings = await query<{ code: string }>(
        `SELECT code FROM geo_areas WHERE parent_code = $1 AND level = 'gemeente'`,
        [provincie_code],
      );
      const siblingCodes = siblings.rows.map(r => r.code);
      const series = await computeMeanSeries(siblingCodes, opts.source, opts.yearFilter, opts.dimension, opts.dimensionValue, opts.dataOrigin);
      block.provincie = {
        kind: 'provincie',
        label: `Provincie: ${provincie_name}`,
        series,
      };
    }
    // If parent unresolvable (data gap — most gemeenten lack parent_code), provincie ref omitted gracefully.
  }

  // Land — average across all gemeenten in NL.
  if (requested.has('land')) {
    const allGemeenten = await query<{ code: string }>(
      `SELECT code FROM geo_areas WHERE level = 'gemeente'`,
    );
    const codes = allGemeenten.rows.map(r => r.code);
    const series = await computeMeanSeries(codes, opts.source, opts.yearFilter, opts.dimension, opts.dimensionValue, opts.dataOrigin);
    block.land = {
      kind: 'land',
      // The series is the AVG across all gemeenten (see computeMeanSeries) —
      // i.e. "mean Dutch gemeente", not the NL total. Labelled as
      // "Landelijk gemiddelde" so the visual + chip stop implying a comparison
      // against NL absolute totals (issue #76).
      label: 'Landelijk gemiddelde',
      series,
    };
  }

  return block;
}

export const _internals = {
  defaultCohortType,
  COHORT_DEFAULT_BY_SUPERCATEGORY,
};
