import { useEffect, useState } from 'react';
import { api } from '../services/api/client';
import { useAuth } from '../contexts/AuthContext';

export interface SourceAttribution {
  key: string;
  name: string;
  supercategory: string;
  cbsTableId: string | null;
  cbsTableTitle: string | null;
  lastSyncAt: string | null;
  statlineUrl: string | null;
}

/**
 * Module-level cache so we only fetch once per page-load regardless of how
 * many tiles render. Attribution data changes only on sync runs (minutes-
 * to-hours cadence) so this is plenty fresh.
 */
let cachedSources: SourceAttribution[] | null = null;
let inflight: Promise<SourceAttribution[]> | null = null;

async function fetchAttributions(): Promise<SourceAttribution[]> {
  if (cachedSources) return cachedSources;
  if (inflight) return inflight;
  inflight = api.get<{ sources: SourceAttribution[] }>('/datasources/attribution')
    .then(r => {
      cachedSources = r.sources;
      inflight = null;
      return r.sources;
    })
    .catch(() => {
      inflight = null;
      return [];
    });
  return inflight;
}

export function useSourceAttribution(sourceKey: string | undefined): SourceAttribution | null {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [attribution, setAttribution] = useState<SourceAttribution | null>(() => {
    if (!sourceKey || !cachedSources) return null;
    return cachedSources.find(s => s.key === sourceKey) ?? null;
  });

  useEffect(() => {
    if (authLoading || !isAuthenticated || !sourceKey) return;
    let cancelled = false;
    void fetchAttributions().then(sources => {
      if (cancelled) return;
      setAttribution(sources.find(s => s.key === sourceKey) ?? null);
    });
    return () => { cancelled = true; };
  }, [authLoading, isAuthenticated, sourceKey]);

  return attribution;
}
