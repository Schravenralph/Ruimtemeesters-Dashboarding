import { describe, it, expect } from 'vitest';
import { _internals } from './theme-diff.service';
import type { TileConfig } from '../../../shared/api/contracts';

const { diffTiles } = _internals;

function tile(overrides: Partial<TileConfig> & { id: string }): TileConfig {
  return {
    id: overrides.id,
    title: overrides.title ?? 'Default title',
    chartType: (overrides.chartType ?? 'line') as TileConfig['chartType'],
    dataSource: overrides.dataSource ?? 'bevolking',
    dimensions: overrides.dimensions ?? [],
    defaultGeoLevel: overrides.defaultGeoLevel ?? 'gemeente',
    description: overrides.description,
    config: overrides.config ?? {},
  };
}

describe('theme-diff — diffTiles helper', () => {
  it('equal tile lists produce empty diff', () => {
    const project = [tile({ id: 'a' }), tile({ id: 'b' })];
    const template = [tile({ id: 'a' }), tile({ id: 'b' })];
    expect(diffTiles(project, template)).toEqual([]);
  });

  it('pure-add: tile in template not in project → kind=added with `after`', () => {
    const a = tile({ id: 'a' });
    const b = tile({ id: 'b', title: 'New tile' });
    const diff = diffTiles([a], [a, b]);
    expect(diff).toHaveLength(1);
    expect(diff[0]).toMatchObject({ kind: 'added', tileId: 'b' });
    expect(diff[0].after).toEqual(b);
    expect(diff[0].before).toBeUndefined();
  });

  it('pure-remove: tile in project not in template → kind=removed with `before`', () => {
    const a = tile({ id: 'a' });
    const b = tile({ id: 'b', title: 'Dropped tile' });
    const diff = diffTiles([a, b], [a]);
    expect(diff).toHaveLength(1);
    expect(diff[0]).toMatchObject({ kind: 'removed', tileId: 'b' });
    expect(diff[0].before).toEqual(b);
    expect(diff[0].after).toBeUndefined();
  });

  it('modified-config: same id, different config → kind=modified with before+after', () => {
    const before = tile({ id: 'a', config: { color: 'blue' } });
    const after = tile({ id: 'a', config: { color: 'red' } });
    const diff = diffTiles([before], [after]);
    expect(diff).toHaveLength(1);
    expect(diff[0]).toMatchObject({ kind: 'modified', tileId: 'a' });
    expect(diff[0].before).toEqual(before);
    expect(diff[0].after).toEqual(after);
  });

  it('description-only changes are NOT modifications (copy edits do not trigger updates)', () => {
    const before = tile({ id: 'a', description: 'Oude beschrijving' });
    const after = tile({ id: 'a', description: 'Nieuwe beschrijving' });
    expect(diffTiles([before], [after])).toEqual([]);
  });

  it('combined: add + remove + modified in one diff', () => {
    const a = tile({ id: 'a' });
    const aModified = tile({ id: 'a', chartType: 'bar' as TileConfig['chartType'] });
    const b = tile({ id: 'b' });
    const c = tile({ id: 'c', title: 'New' });
    const diff = diffTiles([a, b], [aModified, c]);
    expect(diff).toHaveLength(3);
    const kinds = diff.map(e => `${e.kind}:${e.tileId}`).sort();
    expect(kinds).toEqual(['added:c', 'modified:a', 'removed:b']);
  });
});
