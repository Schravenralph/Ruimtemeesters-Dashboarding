import { query } from '../db/pool.js';

/**
 * Data pipeline service for ETL operations.
 * Handles data transformations and derived calculations.
 */

interface PipelineStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  rowsAffected?: number;
  error?: string;
  durationMs?: number;
}

interface PipelineResult {
  steps: PipelineStep[];
  totalDurationMs: number;
  overallStatus: 'success' | 'partial' | 'failed';
}

/**
 * Calculate derived metrics from base data.
 * For example, calculate per-capita values, growth rates, density, etc.
 */
export async function runDerivedCalculations(year: number): Promise<PipelineResult> {
  const startTime = Date.now();
  const steps: PipelineStep[] = [];

  // Step 1: Calculate total population per area
  const step1Start = Date.now();
  try {
    const result = await query(`
      INSERT INTO data_bevolking (geo_code, year, age_group, gender, value)
      SELECT geo_code, year, 'totaal' as age_group, 'totaal' as gender, SUM(value) as value
      FROM data_bevolking
      WHERE year = $1 AND age_group != 'totaal'
      GROUP BY geo_code, year
      ON CONFLICT (geo_code, year, age_group, gender) DO UPDATE SET value = EXCLUDED.value
    `, [year]);

    steps.push({
      name: 'Bevolking totalen berekenen',
      status: 'completed',
      rowsAffected: result.rowCount || 0,
      durationMs: Date.now() - step1Start,
    });
  } catch (err) {
    steps.push({
      name: 'Bevolking totalen berekenen',
      status: 'failed',
      error: err instanceof Error ? err.message : 'Unknown error',
      durationMs: Date.now() - step1Start,
    });
  }

  // Step 2: Calculate total households per area
  const step2Start = Date.now();
  try {
    const result = await query(`
      INSERT INTO data_huishoudens (geo_code, year, household_type, value)
      SELECT geo_code, year, 'totaal' as household_type, SUM(value) as value
      FROM data_huishoudens
      WHERE year = $1 AND household_type != 'totaal'
      GROUP BY geo_code, year
      ON CONFLICT (geo_code, year, household_type) DO UPDATE SET value = EXCLUDED.value
    `, [year]);

    steps.push({
      name: 'Huishoudens totalen berekenen',
      status: 'completed',
      rowsAffected: result.rowCount || 0,
      durationMs: Date.now() - step2Start,
    });
  } catch (err) {
    steps.push({
      name: 'Huishoudens totalen berekenen',
      status: 'failed',
      error: err instanceof Error ? err.message : 'Unknown error',
      durationMs: Date.now() - step2Start,
    });
  }

  // Step 3: Calculate total housing per area
  const step3Start = Date.now();
  try {
    const result = await query(`
      INSERT INTO data_woningen (geo_code, year, tenure_type, dwelling_type, value)
      SELECT geo_code, year, 'totaal' as tenure_type, 'totaal' as dwelling_type, SUM(value) as value
      FROM data_woningen
      WHERE year = $1 AND tenure_type != 'totaal'
      GROUP BY geo_code, year
      ON CONFLICT (geo_code, year, tenure_type, dwelling_type) DO UPDATE SET value = EXCLUDED.value
    `, [year]);

    steps.push({
      name: 'Woningen totalen berekenen',
      status: 'completed',
      rowsAffected: result.rowCount || 0,
      durationMs: Date.now() - step3Start,
    });
  } catch (err) {
    steps.push({
      name: 'Woningen totalen berekenen',
      status: 'failed',
      error: err instanceof Error ? err.message : 'Unknown error',
      durationMs: Date.now() - step3Start,
    });
  }

  const totalDurationMs = Date.now() - startTime;
  const failedSteps = steps.filter(s => s.status === 'failed');

  return {
    steps,
    totalDurationMs,
    overallStatus: failedSteps.length === 0
      ? 'success'
      : failedSteps.length === steps.length
        ? 'failed'
        : 'partial',
  };
}

/**
 * Get the status of the last pipeline run.
 */
export function getPipelineStatus(): { lastRun: Date | null; nextScheduled: Date | null } {
  return {
    lastRun: null, // Would be tracked in production
    nextScheduled: null,
  };
}
