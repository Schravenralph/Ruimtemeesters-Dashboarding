import { describe, it, expect } from 'vitest';
import { GEO_LEVEL_LABELS, getParentLevel, getChildLevel } from './geo';

describe('geo utilities - extended', () => {
  it('all levels have labels', () => {
    const levels = ['land', 'provincie', 'corop', 'gemeente', 'wijk', 'buurt'];
    for (const level of levels) {
      expect(GEO_LEVEL_LABELS[level]).toBeTruthy();
    }
  });

  it('parent-child chain is consistent', () => {
    // land -> provincie -> corop -> gemeente -> wijk -> buurt
    expect(getChildLevel('land')).toBe('provincie');
    expect(getParentLevel('provincie')).toBe('land');
    expect(getChildLevel('provincie')).toBe('corop');
    expect(getParentLevel('corop')).toBe('provincie');
  });
});
