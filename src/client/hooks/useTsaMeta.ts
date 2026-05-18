import { useEffect, useState } from 'react';
import { api } from '../services/api/client';

export interface TsaMeta {
  source: string;
  models: number;
  modelProfile: string | null;
  hasPrognose: boolean;
  confidence: number | null;
  trainStart: number | null;
  trainEnd: number | null;
  forecastStart: number | null;
  forecastEnd: number | null;
  lastRefit: string | null;
  cbsTableId: string | null;
  cbsTableTitle: string | null;
  cbsSourceName: string | null;
}

/**
 * Per-tile TSA forecast metadata for the AI-prognose badge tooltip (#149).
 * Returns null until the request settles; null forever if the request fails.
 * Skip — and skip rendering the badge — when `enabled` is false.
 */
export function useTsaMeta(source: string | undefined, geoCode: string | undefined, enabled = true): TsaMeta | null {
  const [meta, setMeta] = useState<TsaMeta | null>(null);

  useEffect(() => {
    if (!enabled || !source) {
      setMeta(null);
      return;
    }
    let cancelled = false;
    api.get<TsaMeta>('/data/prognose-meta', {
      source,
      ...(geoCode ? { geoCode } : {}),
    })
      .then(r => { if (!cancelled) setMeta(r); })
      .catch(() => { if (!cancelled) setMeta(null); });
    return () => { cancelled = true; };
  }, [source, geoCode, enabled]);

  return meta;
}
