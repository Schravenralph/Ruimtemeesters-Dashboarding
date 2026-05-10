import { describe, it, expect } from 'vitest';
import { _internals } from './project-bootstrap.service';

const { slugify } = _internals;

describe('project bootstrap — slugify', () => {
  it('lowercases', () => expect(slugify('Woonzorgvisie 2030')).toBe('woonzorgvisie-2030'));
  it('strips quotes/punct', () => expect(slugify("'s-Hertogenbosch  ")).toBe('s-hertogenbosch'));
  it('truncates over 80 chars', () => {
    const long = 'a'.repeat(150);
    expect(slugify(long).length).toBeLessThanOrEqual(80);
  });
  it('falls back to "project" for all-empty', () => expect(slugify('!@#')).toBe('project'));
});
