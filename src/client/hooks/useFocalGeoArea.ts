import { useEffect, useState } from 'react';
import { getArea } from '../services/api/geo';
import { useFilters } from '../contexts/FilterContext';
import { useAuth } from '../contexts/AuthContext';

export interface FocalGeoArea {
  code: string;
  name: string;
  level: string;
}

const cache = new Map<string, FocalGeoArea>();
const inflight = new Map<string, Promise<FocalGeoArea | null>>();

async function fetchArea(code: string): Promise<FocalGeoArea | null> {
  const hit = cache.get(code);
  if (hit) return hit;
  const pending = inflight.get(code);
  if (pending) return pending;
  const p = getArea(code)
    .then(a => {
      const ga: FocalGeoArea = { code: a.code, name: a.name, level: a.level };
      cache.set(code, ga);
      inflight.delete(code);
      return ga;
    })
    .catch(() => {
      inflight.delete(code);
      return null;
    });
  inflight.set(code, p);
  return p;
}

/**
 * Resolve the focal geo (from FilterContext.geoCode) to its display
 * label, e.g. "Amsterdam (GM0363)". Used by chart components to label
 * the focal series instead of the generic "Gemeente" string.
 */
export function useFocalGeoArea(): FocalGeoArea | null {
  const { filters } = useFilters();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [area, setArea] = useState<FocalGeoArea | null>(() =>
    filters.geoCode ? cache.get(filters.geoCode) ?? null : null,
  );

  useEffect(() => {
    if (authLoading || !isAuthenticated || !filters.geoCode) return;
    let cancelled = false;
    void fetchArea(filters.geoCode).then(ga => {
      if (!cancelled) setArea(ga);
    });
    return () => { cancelled = true; };
  }, [filters.geoCode, isAuthenticated, authLoading]);

  return area;
}

/**
 * Pretty-print a FocalGeoArea for legend / tooltip labels.
 * Gemeente: "Amsterdam (GM0363)"; provincie/land: "Noord-Holland",
 * "Nederland" without parenthetical code (codes are noise at those
 * levels). Falls back gracefully when area is null.
 */
export function formatFocalLabel(area: FocalGeoArea | null, fallback = 'Gemeente'): string {
  if (!area) return fallback;
  if (area.level === 'gemeente' && area.code) {
    return `${area.name} (${area.code})`;
  }
  return area.name;
}
