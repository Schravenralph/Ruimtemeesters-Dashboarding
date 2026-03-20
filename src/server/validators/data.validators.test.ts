import { describe, it, expect } from 'vitest';
import { BevolkingRow, HuishoudensRow, WoningenRow, WoningtekortRow, GeoAreaInput } from './data.validators';

describe('Data validators', () => {
  describe('BevolkingRow', () => {
    it('validates a valid row', () => {
      const result = BevolkingRow.safeParse({
        geo_code: 'GM0363',
        year: 2024,
        age_group: '25-44',
        gender: 'man',
        value: 100000,
      });
      expect(result.success).toBe(true);
    });

    it('rejects negative value', () => {
      expect(BevolkingRow.safeParse({ geo_code: 'GM0363', year: 2024, value: -1 }).success).toBe(false);
    });

    it('coerces string year', () => {
      const result = BevolkingRow.safeParse({ geo_code: 'GM0363', year: '2024', value: 100 });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.year).toBe(2024);
    });

    it('rejects year out of range', () => {
      expect(BevolkingRow.safeParse({ geo_code: 'GM0363', year: 1800, value: 100 }).success).toBe(false);
    });

    it('allows null age_group', () => {
      const result = BevolkingRow.safeParse({ geo_code: 'GM0363', year: 2024, age_group: null, value: 100 });
      expect(result.success).toBe(true);
    });
  });

  describe('HuishoudensRow', () => {
    it('validates a valid row', () => {
      const result = HuishoudensRow.safeParse({
        geo_code: 'GM0599',
        year: 2023,
        household_type: 'eenpersoons',
        value: 50000,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('WoningenRow', () => {
    it('validates with all fields', () => {
      const result = WoningenRow.safeParse({
        geo_code: 'GM0518',
        year: 2024,
        tenure_type: 'eigendom',
        dwelling_type: 'eengezins',
        value: 30000,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('WoningtekortRow', () => {
    it('accepts negative values for tekort', () => {
      const result = WoningtekortRow.safeParse({
        geo_code: 'GM0363',
        year: 2024,
        metric: 'tekort',
        value: -500,
      });
      expect(result.success).toBe(true);
    });

    it('requires metric', () => {
      const result = WoningtekortRow.safeParse({
        geo_code: 'GM0363',
        year: 2024,
        metric: '',
        value: 100,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('GeoAreaInput', () => {
    it('validates a valid area', () => {
      const result = GeoAreaInput.safeParse({
        code: 'GM0363',
        name: 'Amsterdam',
        level: 'gemeente',
        parentCode: 'NL-NH',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid level', () => {
      const result = GeoAreaInput.safeParse({
        code: 'XX',
        name: 'Test',
        level: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty name', () => {
      const result = GeoAreaInput.safeParse({
        code: 'XX',
        name: '',
        level: 'gemeente',
      });
      expect(result.success).toBe(false);
    });
  });
});
