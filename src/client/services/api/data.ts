import { api } from './client';
import type { DataResponse, Dimension, ReferencesBlock } from '@shared/api/contracts';

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
  // SPEC-B reference series — comma-separated subset of cohort,provincie,land
  references?: string;
  cohortType?: string;
  envelope?: boolean;
}): Promise<DataResponse> {
  // ApiClient.get only accepts string | number | undefined — stringify the boolean.
  const { envelope, ...rest } = params;
  const queryParams: Record<string, string | number | undefined> = {
    ...(rest as Record<string, string | number | undefined>),
    ...(envelope ? { envelope: 'true' } : {}),
  };
  return api.get('/data/query', queryParams);
}

export async function queryTimeSeries(params: {
  source: string;
  geoCode: string;
  dimension?: string;
  dimensionValue?: string;
  dimensionType?: string;
  /** Comma-separated subset of `cohort,provincie,land`. Server returns a
   *  `references` block with one full time series per requested kind. */
  references?: string;
  cohortType?: string;
}): Promise<{ data: Array<{
  year: number;
  value: number;
  source: string;
  confidenceLower?: number;
  confidenceUpper?: number;
  /** Per-row dimension value when the caller varied across `dimension`
   *  without pinning a specific value. Absent when the caller fully
   *  specified `dimensionValue`. */
  dimensionValue?: string;
}>;
  references?: ReferencesBlock;
}> {
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
