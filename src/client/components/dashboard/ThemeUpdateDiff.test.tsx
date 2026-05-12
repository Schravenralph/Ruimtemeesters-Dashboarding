import { describe, it, expect } from 'vitest';
import { pickDefaultSelection } from './ThemeUpdateDiff';
import type { ThemeDiffEntry, TileConfig } from '@shared/api/contracts';

function tile(overrides: Partial<TileConfig> & { id: string }): TileConfig {
  return {
    id: overrides.id,
    title: overrides.title ?? 'Tile',
    chartType: (overrides.chartType ?? 'line') as TileConfig['chartType'],
    dataSource: overrides.dataSource ?? 'bevolking',
    dimensions: overrides.dimensions ?? [],
    defaultGeoLevel: overrides.defaultGeoLevel ?? 'gemeente',
    description: overrides.description,
    config: overrides.config ?? {},
  };
}

describe('ThemeUpdateDiff — pickDefaultSelection', () => {
  it('returns empty set when there are no entries', () => {
    expect(pickDefaultSelection([])).toEqual(new Set());
  });

  it('pre-selects only added entries — conservative default', () => {
    const entries: ThemeDiffEntry[] = [
      { kind: 'added', tileId: 'a', after: tile({ id: 'a' }) },
      { kind: 'modified', tileId: 'b', before: tile({ id: 'b' }), after: tile({ id: 'b', title: 'New' }) },
      { kind: 'removed', tileId: 'c', before: tile({ id: 'c' }) },
      { kind: 'added', tileId: 'd', after: tile({ id: 'd' }) },
    ];
    expect(pickDefaultSelection(entries)).toEqual(new Set(['a', 'd']));
  });

  it('returns empty set when no entries are added', () => {
    const entries: ThemeDiffEntry[] = [
      { kind: 'removed', tileId: 'x', before: tile({ id: 'x' }) },
      { kind: 'modified', tileId: 'y', before: tile({ id: 'y' }), after: tile({ id: 'y', title: 'New' }) },
    ];
    expect(pickDefaultSelection(entries)).toEqual(new Set());
  });
});
