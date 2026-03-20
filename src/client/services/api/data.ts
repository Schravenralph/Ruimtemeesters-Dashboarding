import { api } from './client';
import type { DataResponse, Dimension } from '@shared/api/contracts';

export async function queryData(params: {
  source: string;
  geoLevel?: string;
  geoCode?: string;
  year?: number;
  compareYear?: number;
  dimension?: string;
  dimensionValue?: string;
  limit?: number;
  offset?: number;
}): Promise<DataResponse> {
  return api.get('/data/query', params as Record<string, string | number>);
}

export async function getAvailableYears(source: string): Promise<{ years: number[] }> {
  return api.get(`/data/years/${source}`);
}

export async function getDimensions(source: string): Promise<{ dimensions: Dimension[] }> {
  return api.get(`/data/dimensions/${source}`);
}
