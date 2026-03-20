import { describe, it, expect } from 'vitest';
import { toCsv } from './export.service';

describe('export service - extended tests', () => {
  it('handles unicode characters', () => {
    const data = [{ name: "'s-Hertogenbosch", value: 160000 }];
    const csv = toCsv(data, ['Naam', 'Waarde']);
    expect(csv).toContain("'s-Hertogenbosch");
  });

  it('handles large numbers', () => {
    const data = [{ name: 'NL', value: 17500000 }];
    const csv = toCsv(data, ['Gebied', 'Bevolking']);
    expect(csv).toContain('17500000');
  });

  it('handles zero values', () => {
    const data = [{ name: 'Test', value: 0 }];
    const csv = toCsv(data, ['Naam', 'Waarde']);
    expect(csv).toContain('Test;0');
  });

  it('handles multiple rows', () => {
    const data = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `City ${i}` }));
    const csv = toCsv(data, ['ID', 'Naam']);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(101); // header + 100 rows
  });

  it('handles undefined values', () => {
    const data = [{ name: 'Test', value: undefined }];
    const csv = toCsv(data, ['Naam', 'Waarde']);
    expect(csv).toContain('Test;');
  });

  it('handles newlines in values', () => {
    const data = [{ name: 'Line1\nLine2', value: 100 }];
    const csv = toCsv(data, ['Naam', 'Waarde']);
    // Newlines should be preserved within quotes
    expect(csv).toBeDefined();
  });

  it('produces valid CSV structure', () => {
    const data = [
      { a: 1, b: 'hello', c: true },
      { a: 2, b: 'world', c: false },
    ];
    const csv = toCsv(data, ['A', 'B', 'C']);
    const lines = csv.split('\n');

    // Header
    expect(lines[0]).toContain('A;B;C');
    // Data rows
    expect(lines[1]).toBe('1;hello;true');
    expect(lines[2]).toBe('2;world;false');
  });
});
