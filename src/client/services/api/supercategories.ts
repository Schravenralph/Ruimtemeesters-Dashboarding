import { api } from './client';
import type { Supercategory } from '@shared/api/contracts';

export async function listSupercategories(): Promise<{ supercategories: Supercategory[] }> {
  return api.get('/supercategories');
}
