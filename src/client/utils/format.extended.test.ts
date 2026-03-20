import { describe, it, expect } from 'vitest';
import { formatCompact, dimensionLabel } from './format';

describe('format - edge cases', () => {
  it('formatCompact handles zero', () => {
    expect(formatCompact(0)).toBe('0');
  });

  it('dimensionLabel handles empty string', () => {
    expect(dimensionLabel('')).toBe('');
  });
});
