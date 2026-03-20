import { describe, it, expect } from 'vitest';
import { isValidDate, getYearRange } from './date';

describe('date utilities - extended', () => {
  it('validates ISO date strings', () => {
    expect(isValidDate('2024-06-15T10:30:00Z')).toBe(true);
  });

  it('validates date-only strings', () => {
    expect(isValidDate('2024-01-01')).toBe(true);
  });

  it('rejects gibberish', () => {
    expect(isValidDate('abc123')).toBe(false);
  });
});
