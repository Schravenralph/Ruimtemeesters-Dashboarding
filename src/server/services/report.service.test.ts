import { describe, it, expect, vi, beforeEach } from 'vitest';

const queryMock = vi.fn();
vi.mock('../db/pool.js', () => ({ query: (...args: unknown[]) => queryMock(...args) }));

const { generateReport } = await import('./report.service.js');

function mockRows(rows: Array<Record<string, unknown>>) {
  return { rows } as { rows: Array<Record<string, unknown>> };
}

beforeEach(() => {
  queryMock.mockReset();
});

describe('generateReport — source configs', () => {
  const sources = [
    { key: 'bevolking', unit: 'personen' },
    { key: 'huishoudens', unit: 'huishoudens' },
    { key: 'woningen', unit: 'woningen' },
    { key: 'woningtekort', unit: '%' },
    { key: 'energie', unit: 'TJ' },
    { key: 'emissies', unit: 'ton CO2-eq' },
    { key: 'hernieuwbaar', unit: '' },
    { key: 'afval', unit: 'kg per inwoner' },
  ];

  for (const { key, unit } of sources) {
    it(`generates a report for ${key} with unit "${unit}"`, async () => {
      queryMock
        .mockResolvedValueOnce(mockRows([{ dimension: 'a', total: '100' }, { dimension: 'b', total: '50' }]))
        .mockResolvedValueOnce(mockRows([{ total: '1000' }]))
        .mockResolvedValueOnce(mockRows([{ name: 'Nederland' }]));

      const result = await generateReport({ source: key, geoCode: 'NL', year: 2024 });

      expect(result.unit).toBe(unit);
      expect(result.sections).toHaveLength(2);
      expect(result.sections[0]?.title).toBe('Overzicht');
      expect(result.sections[0]?.data[0]?.value).toBe(1000);
      expect(result.sections[1]?.data).toHaveLength(2);
    });
  }

  it('throws on unknown source', async () => {
    await expect(generateReport({ source: 'nonexistent', geoCode: 'NL', year: 2024 })).rejects.toThrow(/Unknown source/);
  });

  it('uses custom totalLabel for sources that override it', async () => {
    queryMock
      .mockResolvedValueOnce(mockRows([]))
      .mockResolvedValueOnce(mockRows([{ total: '140400' }]))
      .mockResolvedValueOnce(mockRows([{ name: 'Nederland' }]));

    const result = await generateReport({ source: 'emissies', geoCode: 'NL', year: 2024 });
    expect(result.sections[0]?.data[0]?.label).toBe('CO2-uitstoot');
    expect(result.sections[1]?.title).toBe('Overige broeikasgassen');
  });
});
