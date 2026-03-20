import { describe, it, expect } from 'vitest';
import { formatCompact, formatPercent, dimensionLabel, dimensionValueLabel } from './format';

describe('format utilities', () => {
  describe('formatCompact', () => {
    it('formats millions', () => {
      expect(formatCompact(1500000)).toBe('1.5M');
      expect(formatCompact(17500000)).toBe('17.5M');
    });

    it('formats thousands', () => {
      expect(formatCompact(50000)).toBe('50K');
      expect(formatCompact(1000)).toBe('1K');
    });

    it('formats small numbers', () => {
      expect(formatCompact(42)).toBe('42');
      expect(formatCompact(999)).toBe('999');
    });

    it('handles negative numbers', () => {
      expect(formatCompact(-1500000)).toBe('-1.5M');
    });
  });

  describe('formatPercent', () => {
    it('formats positive percentages with plus sign', () => {
      expect(formatPercent(2.5)).toBe('+2.5%');
    });

    it('formats negative percentages', () => {
      expect(formatPercent(-1.3)).toBe('-1.3%');
    });

    it('formats zero', () => {
      expect(formatPercent(0)).toBe('+0.0%');
    });

    it('respects decimal places', () => {
      expect(formatPercent(3.456, 2)).toBe('+3.46%');
    });
  });

  describe('dimensionLabel', () => {
    it('maps known dimension keys', () => {
      expect(dimensionLabel('age_group')).toBe('Leeftijdsgroep');
      expect(dimensionLabel('gender')).toBe('Geslacht');
      expect(dimensionLabel('household_type')).toBe('Type huishouden');
    });

    it('falls back to title case for unknown keys', () => {
      expect(dimensionLabel('some_custom_dim')).toBe('Some Custom Dim');
    });
  });

  describe('dimensionValueLabel', () => {
    it('maps known values', () => {
      expect(dimensionValueLabel('man')).toBe('Man');
      expect(dimensionValueLabel('vrouw')).toBe('Vrouw');
      expect(dimensionValueLabel('eigendom')).toBe('Koopwoning');
      expect(dimensionValueLabel('huur_sociaal')).toBe('Sociale huur');
    });

    it('falls back to title case for unknown values', () => {
      expect(dimensionValueLabel('unknown_value')).toBe('Unknown Value');
    });
  });
});
