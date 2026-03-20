import { describe, it, expect } from 'vitest';
import { BevolkingRow, HuishoudensRow, WoningenRow, WoningtekortRow, GeoAreaInput, DataRowSchemas } from './data.validators';

describe('Data validators - extended', () => {
  describe('BevolkingRow coercion', () => {
    it('coerces string value to number', () => {
      const result = BevolkingRow.safeParse({ geo_code: 'GM0363', year: 2024, value: '42000' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.value).toBe(42000);
    });

    it('rejects non-numeric value', () => {
      expect(BevolkingRow.safeParse({ geo_code: 'GM0363', year: 2024, value: 'abc' }).success).toBe(false);
    });

    it('accepts missing optional fields', () => {
      const result = BevolkingRow.safeParse({ geo_code: 'NL', year: 2024, value: 17500000 });
      expect(result.success).toBe(true);
    });
  });

  describe('WoningtekortRow specifics', () => {
    it('accepts fractional values', () => {
      const result = WoningtekortRow.safeParse({ geo_code: 'GM0363', year: 2024, metric: 'tekort', value: 3.5 });
      expect(result.success).toBe(true);
    });

    it('accepts large values', () => {
      const result = WoningtekortRow.safeParse({ geo_code: 'NL', year: 2024, metric: 'vraag', value: 8000000 });
      expect(result.success).toBe(true);
    });
  });

  describe('GeoAreaInput specifics', () => {
    it('accepts all valid levels', () => {
      const levels = ['land', 'provincie', 'corop', 'gemeente', 'wijk', 'buurt'];
      for (const level of levels) {
        const result = GeoAreaInput.safeParse({ code: 'XX', name: 'Test', level });
        expect(result.success).toBe(true);
      }
    });

    it('rejects code longer than 50 chars', () => {
      const result = GeoAreaInput.safeParse({ code: 'X'.repeat(51), name: 'Test', level: 'gemeente' });
      expect(result.success).toBe(false);
    });
  });

  describe('DataRowSchemas', () => {
    it('has schemas for all sources', () => {
      expect(DataRowSchemas.bevolking).toBeDefined();
      expect(DataRowSchemas.huishoudens).toBeDefined();
      expect(DataRowSchemas.woningen).toBeDefined();
      expect(DataRowSchemas.woningtekort).toBeDefined();
    });

    it('returns undefined for unknown source', () => {
      expect(DataRowSchemas['unknown']).toBeUndefined();
    });
  });
});
