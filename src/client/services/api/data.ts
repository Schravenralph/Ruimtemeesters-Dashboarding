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

export async function queryTimeSeries(params: {
  source: string;
  geoCode: string;
  dimension?: string;
  dimensionValue?: string;
  dimensionType?: string;
}): Promise<{ data: Array<{ year: number; value: number; source: string; confidenceLower?: number; confidenceUpper?: number }> }> {
  return api.get('/data/timeseries', params as Record<string, string>);
}

export async function getAvailableYears(source: string): Promise<{ years: number[] }> {
  return api.get(`/data/years/${source}`);
}

export interface DataSourceSummary {
  key: string;
  name: string;
  supercategory: string;
  unit: string;
  cbsTableId: string | null;
}

export async function listDataSources(): Promise<{ sources: DataSourceSummary[] }> {
  return api.get('/data/sources');
}

export async function getDimensions(source: string): Promise<{ dimensions: Dimension[] }> {
  return api.get(`/data/dimensions/${source}`);
}
