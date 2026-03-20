import { api } from './client';
import type { ThemeConfig } from '@shared/api/contracts';

export async function listThemes(): Promise<{ themes: ThemeConfig[] }> {
  return api.get('/themes');
}

export async function getTheme(slug: string): Promise<ThemeConfig> {
  return api.get(`/themes/${slug}`);
}
