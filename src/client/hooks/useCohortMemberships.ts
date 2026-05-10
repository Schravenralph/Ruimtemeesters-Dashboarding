import { useState, useEffect, useCallback } from 'react';
import { getCohortMemberships } from '../services/api/cohorts';
import type { CohortMembershipsResponse } from '@shared/api/contracts';

/**
 * SPEC-C T1: per-gemeente cohort memberships hook.
 *
 * Cache: sessionStorage, keyed per gemeente code, TTL 1h.
 * Cohort memberships are yearly-stable (CBS Gebieden in Nederland is yearly), so
 * aggressive in-session caching is safe.
 *
 * Returns null memberships when geoCode isn't a gemeente (level !== 'gemeente').
 */

const CACHE_PREFIX = 'rm_cohort_memberships:';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CachedEntry {
  fetchedAt: number;
  data: CohortMembershipsResponse;
}

interface UseCohortMembershipsResult {
  memberships: CohortMembershipsResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

function readCache(geoCode: string): CohortMembershipsResponse | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + geoCode);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEntry;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_PREFIX + geoCode);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(geoCode: string, data: CohortMembershipsResponse): void {
  try {
    const entry: CachedEntry = { fetchedAt: Date.now(), data };
    sessionStorage.setItem(CACHE_PREFIX + geoCode, JSON.stringify(entry));
  } catch {
    // sessionStorage full or unavailable — silently fail (cohorts will refetch).
  }
}

export function useCohortMemberships(geoCode: string | null | undefined): UseCohortMembershipsResult {
  const [memberships, setMemberships] = useState<CohortMembershipsResponse | null>(() =>
    geoCode ? readCache(geoCode) : null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!geoCode || !geoCode.startsWith('GM')) {
      setMemberships(null);
      return;
    }
    const cached = readCache(geoCode);
    if (cached) {
      setMemberships(cached);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCohortMemberships(geoCode);
      writeCache(geoCode, data);
      setMemberships(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cohort memberships');
      setMemberships(null);
    } finally {
      setIsLoading(false);
    }
  }, [geoCode]);

  // Race-safe effect: a rapid sequence of geoCode changes can race in-flight
  // fetches. The cancelled flag prevents a stale resolution from clobbering
  // state set by a later request. Bugbot R1 #63.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!geoCode || !geoCode.startsWith('GM')) {
        if (!cancelled) setMemberships(null);
        return;
      }
      const cached = readCache(geoCode);
      if (cached) {
        if (!cancelled) setMemberships(cached);
        return;
      }
      if (!cancelled) { setIsLoading(true); setError(null); }
      try {
        const data = await getCohortMemberships(geoCode);
        if (cancelled) return;
        writeCache(geoCode, data);
        setMemberships(data);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch cohort memberships');
        setMemberships(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [geoCode]);

  return { memberships, isLoading, error, refetch: fetchData };
}
