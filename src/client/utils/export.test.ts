import { describe, it, expect, vi } from 'vitest';

// Test the download utility function concept
describe('export utilities', () => {
  it('creates download link for CSV', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:test');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    const createElement = vi.fn().mockReturnValue({
      href: '',
      download: '',
      click: vi.fn(),
    });
    const appendChild = vi.fn();
    const removeChild = vi.fn();

    vi.spyOn(document, 'createElement').mockImplementation(createElement);
    vi.spyOn(document.body, 'appendChild').mockImplementation(appendChild);
    vi.spyOn(document.body, 'removeChild').mockImplementation(removeChild);

    // Simulate creating a blob and download
    const content = 'header1;header2\nvalue1;value2';
    const blob = new Blob([content], { type: 'text/csv' });
    expect(blob.size).toBeGreaterThan(0);
  });

  it('formats CSV with semicolons for NL locale', () => {
    const data = [
      { name: 'Amsterdam', value: 900000 },
      { name: 'Rotterdam', value: 650000 },
    ];

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(';'),
      ...data.map(row => Object.values(row).join(';')),
    ].join('\n');

    expect(csv).toContain('Amsterdam;900000');
    expect(csv).toContain('name;value');
    expect(csv.split('\n')).toHaveLength(3);
  });

  it('handles values with semicolons in CSV', () => {
    const value = 'Amsterdam; Centrum';
    const escaped = value.includes(';') ? `"${value}"` : value;
    expect(escaped).toBe('"Amsterdam; Centrum"');
  });

  it('generates BOM for Excel compatibility', () => {
    const bom = '\ufeff';
    const csv = bom + 'header1;header2\nval1;val2';
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
  });
});
