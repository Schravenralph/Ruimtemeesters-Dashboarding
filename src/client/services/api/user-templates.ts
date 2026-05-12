import { api } from './client';
import type { UserTemplate, UserTemplateVisibility, TileConfig, LayoutItem } from '@shared/api/contracts';

export type UserTemplateScope = 'mine' | 'org' | 'public';

export interface SaveUserTemplateInput {
  name: string;
  description?: string | null;
  sourceThemeSlug?: string | null;
  tiles: TileConfig[];
  layout: LayoutItem[];
  visibility: UserTemplateVisibility;
}

export async function saveUserTemplate(input: SaveUserTemplateInput): Promise<UserTemplate> {
  return api.post('/user-templates', input);
}

export async function listUserTemplates(scope: UserTemplateScope): Promise<UserTemplate[]> {
  const r = await api.get<{ rows: UserTemplate[] }>(`/user-templates?scope=${scope}`);
  return r.rows ?? [];
}
