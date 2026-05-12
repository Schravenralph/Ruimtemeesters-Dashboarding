import { api } from './client';

export interface Project {
  id: string;
  name: string;
  slug: string;
  themeSlug: string;
  defaultGeoCode: string | null;
  createdAt: string;
}

export interface ProjectDetail extends Project {
  archivedAt: string | null;
  defaultDashboardSlug: string | null;
}

export interface CreateProjectInput {
  name: string;
  /** Exactly one of themeSlug or userTemplateId is required. */
  themeSlug?: string;
  userTemplateId?: string;
  defaultGeoCode?: string;
}

export interface CreateProjectResponse {
  project: Project;
  defaultDashboard: { id: string; projectId: string; name: string; slug: string; sourceTemplateVersion: number };
  subscriptionsAdded: string[];
  routePath: string;
}

export async function listProjects(): Promise<{ projects: Project[] }> {
  return api.get('/projects');
}

export async function getProject(idOrSlug: string): Promise<ProjectDetail> {
  return api.get(`/projects/${idOrSlug}`);
}

export async function createProject(input: CreateProjectInput): Promise<CreateProjectResponse> {
  return api.post('/projects', input);
}

export async function patchProject(id: string, updates: Partial<{ name: string; defaultGeoCode: string | null; archived: boolean }>): Promise<Project> {
  return api.patch(`/projects/${id}`, updates);
}
