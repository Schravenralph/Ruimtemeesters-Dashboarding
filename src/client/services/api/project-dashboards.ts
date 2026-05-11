import { api } from './client';
import type { ProjectDashboard, LayoutItem } from '@shared/api/contracts';

export async function getProjectDashboard(projectIdOrSlug: string, dashboardSlug: string): Promise<ProjectDashboard> {
  return api.get(`/projects/${projectIdOrSlug}/dashboards/${dashboardSlug}`);
}

export async function saveProjectDashboardLayout(
  projectIdOrSlug: string,
  dashboardSlug: string,
  layout: LayoutItem[],
): Promise<{ ok: true }> {
  return api.put(`/projects/${projectIdOrSlug}/dashboards/${dashboardSlug}/layout`, { layout });
}
