import { describe, it, expect } from 'vitest';
import { buildUrl, parseQueryParams, getBasePath, isExternalUrl } from './url';

describe('URL utilities - extended', () => {
  it('buildUrl encodes special characters', () => {
    const url = buildUrl('/api', { name: 'Amsterdam & Utrecht' });
    expect(url).toContain('name=Amsterdam+%26+Utrecht');
  });

  it('buildUrl handles numeric zero', () => {
    const url = buildUrl('/api', { offset: 0 });
    expect(url).toContain('offset=0');
  });

  it('parseQueryParams handles encoded values', () => {
    const params = parseQueryParams('/api?name=Amsterdam%20%26%20Utrecht');
    expect(params.name).toBe('Amsterdam & Utrecht');
  });

  it('getBasePath handles complex URLs', () => {
    expect(getBasePath('/api/data?a=1&b=2#section')).toBe('/api/data');
  });

  it('isExternalUrl rejects mailto', () => {
    expect(isExternalUrl('mailto:test@test.nl')).toBe(false);
  });

  it('isExternalUrl rejects tel', () => {
    expect(isExternalUrl('tel:+31123456789')).toBe(false);
  });

  it('buildUrl preserves path structure', () => {
    const url = buildUrl('/api/data/query', { source: 'bevolking' });
    expect(url.startsWith('/api/data/query?')).toBe(true);
  });

  it('parseQueryParams returns empty for path only', () => {
    expect(Object.keys(parseQueryParams('/simple/path')).length).toBe(0);
  });

  it('getBasePath handles root path', () => {
    expect(getBasePath('/')).toBe('/');
  });

  it('buildUrl with all types', () => {
    const url = buildUrl('/test', { str: 'hello', num: 42, bool: true });
    expect(url).toContain('str=hello');
    expect(url).toContain('num=42');
    expect(url).toContain('bool=true');
  });

  it('isExternalUrl handles protocol-relative URLs', () => {
    // Protocol-relative URLs start with // but not http(s)://
    expect(isExternalUrl('//example.com')).toBe(false);
  });
});
