import { api } from './client';
import type {
  ProjectDashboard, LayoutItem,
  ThemeDiffResponse, ThemeApplyResponse,
} from '@shared/api/contracts';

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

export async function getThemeDiff(
  projectIdOrSlug: string,
  dashboardSlug: string,
): Promise<ThemeDiffResponse> {
  return api.get(`/projects/${projectIdOrSlug}/dashboards/${dashboardSlug}/theme-diff`);
}

export async function applyThemeDiff(
  projectIdOrSlug: string,
  dashboardSlug: string,
  tileIds: string[],
): Promise<ThemeApplyResponse> {
  return api.post(`/projects/${projectIdOrSlug}/dashboards/${dashboardSlug}/theme-apply`, { tileIds });
}
