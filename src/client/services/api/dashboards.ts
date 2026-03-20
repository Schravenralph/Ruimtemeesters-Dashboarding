import { api } from './client';
import type { CustomDashboard, LayoutItem } from '@shared/api/contracts';

export async function listCustomDashboards(): Promise<{ dashboards: CustomDashboard[] }> {
  return api.get('/dashboards/custom');
}

export async function createCustomDashboard(data: {
  name: string;
  description?: string;
  tiles?: unknown[];
  layout?: unknown[];
}): Promise<CustomDashboard> {
  return api.post('/dashboards/custom', data);
}

export async function updateCustomDashboard(id: string, data: Partial<{
  name: string;
  description: string;
  tiles: unknown[];
  layout: unknown[];
}>): Promise<CustomDashboard> {
  return api.put(`/dashboards/custom/${id}`, data);
}

export async function deleteCustomDashboard(id: string): Promise<void> {
  return api.delete(`/dashboards/custom/${id}`);
}

export async function shareDashboard(id: string): Promise<{ shareToken: string; shareExpiresAt: string }> {
  return api.post(`/dashboards/custom/${id}/share`);
}

export async function getSharedDashboard(token: string): Promise<CustomDashboard> {
  return api.get(`/dashboards/shared/${token}`);
}

export async function getLayout(themeId: string): Promise<{ items: LayoutItem[] }> {
  return api.get(`/dashboards/layout/${themeId}`);
}

export async function saveLayout(themeId: string, items: LayoutItem[]): Promise<void> {
  return api.put(`/dashboards/layout/${themeId}`, { items });
}
