import { api } from './client';
import type { UserTemplate, UserTemplateVisibility, TileConfig, LayoutItem } from '@shared/api/contracts';

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
