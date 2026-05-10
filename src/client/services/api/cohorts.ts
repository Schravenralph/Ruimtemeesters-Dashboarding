import { api } from './client';
import type { CohortMembershipsResponse } from '@shared/api/contracts';

/**
 * Fetch cohort memberships + members + per-theme defaults for a focal gemeente.
 * Backed by GET /api/cohorts/:gemeenteCode (SPEC-A).
 */
export async function getCohortMemberships(gemeenteCode: string): Promise<CohortMembershipsResponse> {
  return api.get(`/cohorts/${gemeenteCode}`);
}
