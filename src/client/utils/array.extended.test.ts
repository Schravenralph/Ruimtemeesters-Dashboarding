import { describe, it, expect } from 'vitest';
import { groupBy, uniqueBy, sortBy, chunk, sumBy } from './array';

describe('array utilities - extended', () => {
  describe('groupBy extended', () => {
    it('handles single-item groups', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const groups = groupBy(items, i => String(i.id));
      expect(Object.keys(groups)).toHaveLength(3);
    });

    it('handles all same key', () => {
      const items = [{ type: 'a' }, { type: 'a' }, { type: 'a' }];
      const groups = groupBy(items, i => i.type);
      expect(groups.a).toHaveLength(3);
    });
  });

  describe('uniqueBy extended', () => {
    it('handles empty array', () => {
      expect(uniqueBy([], () => '')).toEqual([]);
    });

    it('handles all unique', () => {
      const items = [1, 2, 3];
      expect(uniqueBy(items, String)).toEqual([1, 2, 3]);
    });
  });

  describe('chunk extended', () => {
    it('handles chunk size larger than array', () => {
      expect(chunk([1, 2], 10)).toEqual([[1, 2]]);
    });

    it('handles chunk size of 1', () => {
      expect(chunk([1, 2, 3], 1)).toEqual([[1], [2], [3]]);
    });
  });

  describe('sumBy extended', () => {
    it('handles negative values', () => {
      const items = [{ v: 10 }, { v: -5 }, { v: 3 }];
      expect(sumBy(items, i => i.v)).toBe(8);
    });

    it('handles floating point', () => {
      const items = [{ v: 1.5 }, { v: 2.5 }];
      expect(sumBy(items, i => i.v)).toBe(4);
    });
  });
});
