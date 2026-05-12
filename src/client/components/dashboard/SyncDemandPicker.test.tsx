import { describe, it, expect } from 'vitest';
import { distinctDataSources, SYNC_DEMAND_PRESETS } from './SyncDemandPicker';
import type { TileConfig } from '@shared/api/contracts';

function tile(id: string, dataSource: string): TileConfig {
  return {
    id, title: id,
    chartType: 'line' as TileConfig['chartType'],
    dataSource,
    dimensions: [], defaultGeoLevel: 'gemeente', config: {},
  };
}

describe('distinctDataSources — pure helper', () => {
  it('returns empty for no tiles', () => {
    expect(distinctDataSources([])).toEqual([]);
  });

  it('returns one entry per distinct dataSource, in encounter order', () => {
    const tiles = [
      tile('a', 'bevolking'),
      tile('b', 'huishoudens'),
      tile('c', 'bevolking'),  // dup
      tile('d', 'woningen'),
    ];
    expect(distinctDataSources(tiles)).toEqual(['bevolking', 'huishoudens', 'woningen']);
  });

  it('skips tiles with empty dataSource', () => {
    const tiles = [tile('a', 'bevolking'), { ...tile('b', ''), dataSource: '' }];
    expect(distinctDataSources(tiles)).toEqual(['bevolking']);
  });
});

describe('SYNC_DEMAND_PRESETS', () => {
  it('lists 4 cadences from monthly (loosest) to hourly (strictest)', () => {
    expect(SYNC_DEMAND_PRESETS).toHaveLength(4);
    expect(SYNC_DEMAND_PRESETS.map(p => p.label)).toEqual([
      'Maandelijks', 'Wekelijks', 'Dagelijks', 'Per uur',
    ]);
  });

  it('every preset has a 5-field cron expression', () => {
    for (const p of SYNC_DEMAND_PRESETS) {
      expect(p.cron.trim().split(/\s+/)).toHaveLength(5);
    }
  });
});
