import { api } from './client';

export interface SyncDemandResult {
  demandId: string;
  expiresAt: string;
  aggregation: {
    dataSourceKey: string;
    effectiveCron: string;
    changed: boolean;
    appliedDemandCount: number;
    cappedAt: string | null;
  };
}

export async function submitSyncDemand(
  dataSourceKey: string,
  requestedCron: string,
): Promise<SyncDemandResult> {
  return api.post('/sync-demands', { dataSourceKey, requestedCron });
}
