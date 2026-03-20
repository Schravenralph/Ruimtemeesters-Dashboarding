import { describe, it, expect } from 'vitest';
import { groupBy, uniqueBy, sortBy, chunk, sumBy } from './array';

describe('array utilities', () => {
  describe('groupBy', () => {
    it('groups items by key', () => {
      const items = [
        { name: 'A', type: 'x' },
        { name: 'B', type: 'y' },
        { name: 'C', type: 'x' },
      ];
      const groups = groupBy(items, i => i.type);
      expect(groups.x).toHaveLength(2);
      expect(groups.y).toHaveLength(1);
    });

    it('handles empty array', () => {
      expect(groupBy([], () => '')).toEqual({});
    });
  });

  describe('uniqueBy', () => {
    it('removes duplicates by key', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 1 }, { id: 3 }];
      const unique = uniqueBy(items, i => String(i.id));
      expect(unique).toHaveLength(3);
    });

    it('keeps first occurrence', () => {
      const items = [{ id: 1, val: 'a' }, { id: 1, val: 'b' }];
      const unique = uniqueBy(items, i => String(i.id));
      expect(unique[0].val).toBe('a');
    });
  });

  describe('sortBy', () => {
    it('sorts by single comparator', () => {
      const items = [3, 1, 2];
      const sorted = sortBy(items, (a, b) => a - b);
      expect(sorted).toEqual([1, 2, 3]);
    });

    it('sorts by multiple comparators', () => {
      const items = [
        { name: 'B', age: 20 },
        { name: 'A', age: 30 },
        { name: 'A', age: 20 },
      ];
      const sorted = sortBy(
        items,
        (a, b) => a.name.localeCompare(b.name),
        (a, b) => a.age - b.age,
      );
      expect(sorted[0]).toEqual({ name: 'A', age: 20 });
      expect(sorted[1]).toEqual({ name: 'A', age: 30 });
    });

    it('does not mutate original', () => {
      const items = [3, 1, 2];
      sortBy(items, (a, b) => a - b);
      expect(items).toEqual([3, 1, 2]);
    });
  });

  describe('chunk', () => {
    it('splits array into chunks', () => {
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('handles exact division', () => {
      expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
    });

    it('handles empty array', () => {
      expect(chunk([], 3)).toEqual([]);
    });
  });

  describe('sumBy', () => {
    it('sums values', () => {
      const items = [{ v: 10 }, { v: 20 }, { v: 30 }];
      expect(sumBy(items, i => i.v)).toBe(60);
    });

    it('returns 0 for empty', () => {
      expect(sumBy([], () => 0)).toBe(0);
    });
  });
});
