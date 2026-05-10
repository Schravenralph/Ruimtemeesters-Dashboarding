import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCohortMemberships } from './useCohortMemberships';

vi.mock('../services/api/cohorts', () => ({
  getCohortMemberships: vi.fn(),
}));
import { getCohortMemberships } from '../services/api/cohorts';
const mockedGet = getCohortMemberships as ReturnType<typeof vi.fn>;

const sampleResponse = {
  geoCode: 'GM0363',
  memberships: [
    { cohortType: 'populatiegrootte', cohortKey: 'popbin_g4', name: 'G4', description: null, source: 'CBS', sourceUrl: null, sourceVintage: '2026-05-10', members: ['GM0363', 'GM0599', 'GM0518', 'GM0344'], memberCount: 4 },
  ],
  defaultByTheme: {},
};

describe('useCohortMemberships', () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockedGet.mockReset();
  });

  it('returns null memberships for non-gemeente codes', async () => {
    const { result } = renderHook(() => useCohortMemberships('NL'));
    await waitFor(() => expect(result.current.memberships).toBeNull());
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('fetches on mount for a gemeente code and caches the result', async () => {
    mockedGet.mockResolvedValue(sampleResponse);
    const { result } = renderHook(() => useCohortMemberships('GM0363'));
    await waitFor(() => expect(result.current.memberships?.geoCode).toBe('GM0363'));
    expect(mockedGet).toHaveBeenCalledTimes(1);

    // Second mount with same code should hit cache, no second fetch.
    const { result: result2 } = renderHook(() => useCohortMemberships('GM0363'));
    await waitFor(() => expect(result2.current.memberships?.geoCode).toBe('GM0363'));
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it('returns null and surfaces error on fetch failure', async () => {
    mockedGet.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useCohortMemberships('GM9999'));
    await waitFor(() => expect(result.current.error).toBe('boom'));
    expect(result.current.memberships).toBeNull();
  });

  it('honours TTL — expired cache triggers refetch', async () => {
    // Pre-seed an expired cache entry
    sessionStorage.setItem('rm_cohort_memberships:GM0363', JSON.stringify({
      fetchedAt: Date.now() - (2 * 60 * 60 * 1000), // 2h ago, > 1h TTL
      data: sampleResponse,
    }));
    mockedGet.mockResolvedValue(sampleResponse);
    const { result } = renderHook(() => useCohortMemberships('GM0363'));
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(1));
    expect(result.current.memberships?.geoCode).toBe('GM0363');
  });
});
