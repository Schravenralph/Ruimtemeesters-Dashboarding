import { describe, it, expect } from 'vitest';

describe('data-source-registry fallback', () => {
  it('returns fallback sources structure', async () => {
    // Test the fallback structure directly (DB may or may not be available in test env)
    const mod = await import('./data-source-registry.js');
    const sources = await mod.getDataSources();

    expect(sources.bevolking).toBeDefined();
    expect(sources.bevolking.tableName).toBe('data_bevolking');
    expect(sources.bevolking.dimensionColumns).toEqual(['age_group', 'gender']);
    expect(sources.bevolking.unit).toBe('aantal');

    expect(sources.huishoudens.defaultFilters).toEqual({ dimension_type: 'samenstelling' });
    expect(sources.woningtekort.unit).toBe('percentage');
  });

  it('getDataSource returns null for unknown key', async () => {
    const { getDataSource } = await import('./data-source-registry.js');
    const result = await getDataSource('nonexistent');
    expect(result).toBeNull();
  });

  it('invalidateCache clears without error', async () => {
    const { invalidateCache } = await import('./data-source-registry.js');
    expect(() => invalidateCache()).not.toThrow();
  });
});
