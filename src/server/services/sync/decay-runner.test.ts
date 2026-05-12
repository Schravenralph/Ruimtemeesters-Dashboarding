import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../db/pool.js', () => {
  const calls: Array<{ sql: string; params?: unknown[] }> = [];
  return {
    pool: {} as unknown,
    query: vi.fn(async (sql: string, params?: unknown[]) => {
      calls.push({ sql, params });
      if (/SELECT DISTINCT data_source_key/.test(sql)) {
        return { rows: [{ data_source_key: 'bevolking' }, { data_source_key: 'energie' }], rowCount: 2 };
      }
      if (/DELETE FROM sync_demand_requests/.test(sql)) {
        return { rows: [{ count: '7' }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }),
    getClient: vi.fn(),
    __calls: calls,
  };
});

import { runDecay } from './decay-runner';

describe('runDecay — pure orchestrator', () => {
  let aggregateCalls: string[];

  beforeEach(() => {
    aggregateCalls = [];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls aggregate once per distinct source with demand rows', async () => {
    const fakeAggregate = async (k: string) => {
      aggregateCalls.push(k);
      return { changed: false };
    };
    const result = await runDecay(fakeAggregate);
    expect(aggregateCalls).toEqual(['bevolking', 'energie']);
    expect(result.keysProcessed).toBe(2);
  });

  it('counts changed schedules', async () => {
    const fakeAggregate = async (_k: string) => ({ changed: true });
    const result = await runDecay(fakeAggregate);
    expect(result.changedCount).toBe(2);
  });

  it('reports rowsReaped from the DELETE returning clause', async () => {
    const result = await runDecay(async () => ({ changed: false }));
    expect(result.rowsReaped).toBe(7);
  });
});
