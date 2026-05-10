import { describe, it, expect } from 'vitest';
import { _internals } from './cohort-sync.js';

const { POPGROOTTE_BINS, STEDELIJKHEID_LABELS, G4_CODES, slugify, findField } = _internals;

describe('cohort-sync — populatiegrootte bins', () => {
  it('covers the full positive range', () => {
    expect(POPGROOTTE_BINS[0].min).toBe(0);
    expect(POPGROOTTE_BINS[POPGROOTTE_BINS.length - 1].max).toBe(Number.POSITIVE_INFINITY);
    for (let i = 0; i < POPGROOTTE_BINS.length - 1; i++) {
      expect(POPGROOTTE_BINS[i].max).toBe(POPGROOTTE_BINS[i + 1].min);
    }
  });

  it('has exactly 5 bins matching the spec', () => {
    expect(POPGROOTTE_BINS.map(b => b.key)).toEqual([
      'popbin_lt_20k',
      'popbin_20_50k',
      'popbin_50_100k',
      'popbin_100_250k',
      'popbin_g4',
    ]);
  });

  it('bins integers correctly at boundaries', () => {
    function bin(pop: number) {
      return POPGROOTTE_BINS.find(b => pop >= b.min && pop < b.max)?.key;
    }
    expect(bin(0)).toBe('popbin_lt_20k');
    expect(bin(19999)).toBe('popbin_lt_20k');
    expect(bin(20000)).toBe('popbin_20_50k');
    expect(bin(49999)).toBe('popbin_20_50k');
    expect(bin(50000)).toBe('popbin_50_100k');
    expect(bin(100000)).toBe('popbin_100_250k');
    expect(bin(249999)).toBe('popbin_100_250k');
    expect(bin(250000)).toBe('popbin_g4');
    expect(bin(900000)).toBe('popbin_g4');
  });
});

describe('cohort-sync — G4 codes', () => {
  it('contains the 4 cities, no more, no less', () => {
    expect(G4_CODES.size).toBe(4);
    expect(G4_CODES.has('GM0363')).toBe(true); // Amsterdam
    expect(G4_CODES.has('GM0599')).toBe(true); // Rotterdam
    expect(G4_CODES.has('GM0518')).toBe(true); // Den Haag
    expect(G4_CODES.has('GM0344')).toBe(true); // Utrecht
  });
});

describe('cohort-sync — stedelijkheid labels', () => {
  it('maps 1 → "Zeer sterk stedelijk" and 5 → "Niet stedelijk"', () => {
    expect(STEDELIJKHEID_LABELS['1']).toBe('Zeer sterk stedelijk');
    expect(STEDELIJKHEID_LABELS['5']).toBe('Niet stedelijk');
  });

  it('covers all 5 classes', () => {
    expect(Object.keys(STEDELIJKHEID_LABELS).sort()).toEqual(['1', '2', '3', '4', '5']);
  });
});

describe('cohort-sync — slugify', () => {
  it('lowercases and replaces whitespace with underscore', () => {
    expect(slugify('Woningmarktregio Amsterdam')).toBe('woningmarktregio_amsterdam');
  });
  it('strips punctuation but keeps hyphens', () => {
    expect(slugify('Den Haag/Rijswijk')).toBe('den_haagrijswijk');
    expect(slugify("'s-Hertogenbosch")).toBe('s-hertogenbosch');
  });
  it('collapses repeated whitespace', () => {
    expect(slugify('Foo   Bar')).toBe('foo_bar');
  });
});

describe('cohort-sync — findField', () => {
  it('returns the first candidate that exists in the row', () => {
    expect(findField({ Stedelijkheid: '3' }, ['Stedelijkheid', 'MateVanStedelijkheid'])).toBe('Stedelijkheid');
    expect(findField({ MateVanStedelijkheid: '3' }, ['Stedelijkheid', 'MateVanStedelijkheid'])).toBe('MateVanStedelijkheid');
  });
  it('returns null when no candidate exists', () => {
    expect(findField({ Other: 'x' }, ['Stedelijkheid', 'MateVanStedelijkheid'])).toBeNull();
  });
});
