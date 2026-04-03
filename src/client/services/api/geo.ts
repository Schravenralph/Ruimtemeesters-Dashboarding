import { api } from './client';
import type { GeoArea } from '@shared/api/contracts';

export async function listAreas(params?: {
  q?: string;
  level?: string;
  parentCode?: string;
}): Promise<{ areas: GeoArea[] }> {
  return api.get('/geo', params as Record<string, string>);
}

export async function getArea(code: string): Promise<GeoArea> {
  return api.get(`/geo/${code}`);
}

export async function getChildren(code: string): Promise<{ areas: GeoArea[] }> {
  return api.get(`/geo/${code}/children`);
}

export interface GeocodeResult {
  display: string;
  type: string;
  gemeenteCode: string | null;
  gemeenteNaam: string | null;
}

export async function geocodeAddress(q: string): Promise<{ results: GeocodeResult[] }> {
  return api.get('/geo/geocode', { q });
}
