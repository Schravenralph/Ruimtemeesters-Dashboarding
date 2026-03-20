import { describe, it, expect } from 'vitest';
import { buildUrl, parseQueryParams, getBasePath, isExternalUrl } from './url';

describe('URL utilities', () => {
  describe('buildUrl', () => {
    it('returns path without params', () => {
      expect(buildUrl('/api/data')).toBe('/api/data');
    });

    it('adds query params', () => {
      const url = buildUrl('/api/data', { source: 'bevolking', year: 2024 });
      expect(url).toContain('source=bevolking');
      expect(url).toContain('year=2024');
    });

    it('skips undefined params', () => {
      const url = buildUrl('/api/data', { source: 'bevolking', year: undefined });
      expect(url).toContain('source=bevolking');
      expect(url).not.toContain('year');
    });

    it('handles boolean params', () => {
      const url = buildUrl('/api/data', { active: true });
      expect(url).toContain('active=true');
    });

    it('handles empty params', () => {
      expect(buildUrl('/api/data', {})).toBe('/api/data');
    });
  });

  describe('parseQueryParams', () => {
    it('parses query string', () => {
      const params = parseQueryParams('/api?source=bevolking&year=2024');
      expect(params.source).toBe('bevolking');
      expect(params.year).toBe('2024');
    });

    it('handles no params', () => {
      expect(parseQueryParams('/api')).toEqual({});
    });
  });

  describe('getBasePath', () => {
    it('strips query string', () => {
      expect(getBasePath('/api/data?source=bev')).toBe('/api/data');
    });

    it('strips hash', () => {
      expect(getBasePath('/page#section')).toBe('/page');
    });

    it('handles plain path', () => {
      expect(getBasePath('/api/data')).toBe('/api/data');
    });
  });

  describe('isExternalUrl', () => {
    it('detects https URLs', () => {
      expect(isExternalUrl('https://example.com')).toBe(true);
    });

    it('detects http URLs', () => {
      expect(isExternalUrl('http://example.com')).toBe(true);
    });

    it('rejects relative paths', () => {
      expect(isExternalUrl('/api/data')).toBe(false);
    });

    it('rejects anchors', () => {
      expect(isExternalUrl('#section')).toBe(false);
    });
  });
});
