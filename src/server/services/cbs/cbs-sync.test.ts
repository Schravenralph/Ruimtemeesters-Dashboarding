import { describe, it, expect } from 'vitest';
import { ageToGroup, codeToAge } from './cbs-sync';

describe('ageToGroup (Primos-aligned)', () => {
  it('maps age 0 to 0-14', () => expect(ageToGroup(0)).toBe('0-14'));
  it('maps age 14 to 0-14', () => expect(ageToGroup(14)).toBe('0-14'));
  it('maps age 15 to 15-29', () => expect(ageToGroup(15)).toBe('15-29'));
  it('maps age 29 to 15-29', () => expect(ageToGroup(29)).toBe('15-29'));
  it('maps age 30 to 30-44', () => expect(ageToGroup(30)).toBe('30-44'));
  it('maps age 44 to 30-44', () => expect(ageToGroup(44)).toBe('30-44'));
  it('maps age 45 to 45-64', () => expect(ageToGroup(45)).toBe('45-64'));
  it('maps age 64 to 45-64', () => expect(ageToGroup(64)).toBe('45-64'));
  it('maps age 65 to 65-74', () => expect(ageToGroup(65)).toBe('65-74'));
  it('maps age 74 to 65-74', () => expect(ageToGroup(74)).toBe('65-74'));
  it('maps age 75 to 75+', () => expect(ageToGroup(75)).toBe('75+'));
  it('maps age 105 to 75+', () => expect(ageToGroup(105)).toBe('75+'));
  it('maps -1 to totaal', () => expect(ageToGroup(-1)).toBe('totaal'));
  it('returns null for -2', () => expect(ageToGroup(-2)).toBeNull());
});

describe('codeToAge', () => {
  it('maps 10000 to -1 (totaal)', () => expect(codeToAge('10000')).toBe(-1));
  it('maps 10010 to 0', () => expect(codeToAge('10010')).toBe(0));
  it('maps 10100 to 1', () => expect(codeToAge('10100')).toBe(1));
  it('maps 11400 to 14', () => expect(codeToAge('11400')).toBe(14));
  it('maps 11500 to 15', () => expect(codeToAge('11500')).toBe(15));
  it('maps 17500 to 75', () => expect(codeToAge('17500')).toBe(75));
  it('returns null for invalid code', () => expect(codeToAge('99999')).toBeNull());
});
