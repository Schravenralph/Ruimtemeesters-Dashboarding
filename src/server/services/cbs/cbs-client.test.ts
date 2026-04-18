import { describe, it, expect } from 'vitest';
import { parseCbsRegion, parseCbsPeriod } from './cbs-client';

describe('parseCbsRegion', () => {
  it('maps NL01 to land', () => {
    expect(parseCbsRegion('NL01')).toEqual({ code: 'NL', level: 'land' });
  });

  it('maps NL00 to land (alternate national code)', () => {
    expect(parseCbsRegion('NL00')).toEqual({ code: 'NL', level: 'land' });
  });

  it('maps PV20 to provincie', () => {
    expect(parseCbsRegion('PV20')).toEqual({ code: 'NL-20', level: 'provincie' });
  });

  it('maps GM0014 to gemeente', () => {
    expect(parseCbsRegion('GM0014')).toEqual({ code: 'GM0014', level: 'gemeente' });
  });

  it('maps 4-digit PC4 postcode', () => {
    expect(parseCbsRegion('1011')).toEqual({ code: 'PC1011', level: 'postcode' });
  });

  it('maps PC-prefixed postcode', () => {
    expect(parseCbsRegion('PC1011')).toEqual({ code: 'PC1011', level: 'postcode' });
  });

  it('returns null for undefined (no crash)', () => {
    expect(parseCbsRegion(undefined)).toBeNull();
  });

  it('returns null for null', () => {
    expect(parseCbsRegion(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseCbsRegion('')).toBeNull();
  });

  it('returns null for unknown codes', () => {
    expect(parseCbsRegion('ZZ99')).toBeNull();
  });

  it('trims whitespace', () => {
    expect(parseCbsRegion('  NL01 ')).toEqual({ code: 'NL', level: 'land' });
  });
});

describe('parseCbsPeriod', () => {
  it('parses yearly JJ00 codes', () => {
    expect(parseCbsPeriod('2024JJ00')).toBe(2024);
  });

  it('parses monthly MM codes', () => {
    expect(parseCbsPeriod('2024MM03')).toBe(2024);
  });

  it('returns null for unknown formats', () => {
    expect(parseCbsPeriod('2024KW1')).toBeNull();
  });
});
