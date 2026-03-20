import { describe, it, expect } from 'vitest';
import { toCsv } from './export.service';

describe('export service', () => {
  describe('toCsv', () => {
    it('generates CSV with semicolons', () => {
      const data = [
        { name: 'Amsterdam', value: 900000 },
        { name: 'Rotterdam', value: 650000 },
      ];
      const headers = ['Naam', 'Waarde'];
      const csv = toCsv(data, headers);

      expect(csv).toContain('Naam;Waarde');
      expect(csv).toContain('Amsterdam;900000');
      expect(csv).toContain('Rotterdam;650000');
    });

    it('includes BOM for Excel', () => {
      const csv = toCsv([], ['Header']);
      expect(csv.charCodeAt(0)).toBe(0xFEFF);
    });

    it('handles null values', () => {
      const data = [{ name: 'Test', value: null }];
      const csv = toCsv(data, ['Naam', 'Waarde']);
      expect(csv).toContain('Test;');
    });

    it('escapes semicolons in values', () => {
      const data = [{ name: 'Amsterdam; Centrum', value: 100 }];
      const csv = toCsv(data, ['Naam', 'Waarde']);
      expect(csv).toContain('"Amsterdam; Centrum"');
    });

    it('escapes quotes in values', () => {
      const data = [{ name: 'Test "quoted"', value: 100 }];
      const csv = toCsv(data, ['Naam', 'Waarde']);
      expect(csv).toContain('"Test ""quoted"""');
    });

    it('handles empty data', () => {
      const csv = toCsv([], ['Col1', 'Col2']);
      const lines = csv.split('\n');
      expect(lines).toHaveLength(1); // Just header (with BOM)
    });
  });
});
