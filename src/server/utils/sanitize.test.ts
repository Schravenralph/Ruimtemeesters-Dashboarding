import { describe, it, expect } from 'vitest';
import { stripHtml, escapeHtml, sanitizeLikePattern, truncate } from './sanitize';

describe('sanitize utilities', () => {
  describe('stripHtml', () => {
    it('removes HTML tags', () => {
      expect(stripHtml('<p>Hello <b>world</b></p>')).toBe('Hello world');
    });

    it('handles empty string', () => {
      expect(stripHtml('')).toBe('');
    });

    it('handles no tags', () => {
      expect(stripHtml('plain text')).toBe('plain text');
    });

    it('removes script tags', () => {
      expect(stripHtml('<script>alert("xss")</script>Safe')).toBe('alert("xss")Safe');
    });
  });

  describe('escapeHtml', () => {
    it('escapes HTML entities', () => {
      expect(escapeHtml('<div class="test">')).toBe('&lt;div class=&quot;test&quot;&gt;');
    });

    it('escapes ampersands', () => {
      expect(escapeHtml('a & b')).toBe('a &amp; b');
    });

    it('handles clean strings', () => {
      expect(escapeHtml('hello')).toBe('hello');
    });
  });

  describe('sanitizeLikePattern', () => {
    it('escapes percent signs', () => {
      expect(sanitizeLikePattern('100%')).toBe('100\\%');
    });

    it('escapes underscores', () => {
      expect(sanitizeLikePattern('test_value')).toBe('test\\_value');
    });

    it('handles clean strings', () => {
      expect(sanitizeLikePattern('Amsterdam')).toBe('Amsterdam');
    });
  });

  describe('truncate', () => {
    it('truncates long strings', () => {
      expect(truncate('Hello World', 8)).toBe('Hello...');
    });

    it('does not truncate short strings', () => {
      expect(truncate('Hi', 10)).toBe('Hi');
    });

    it('uses custom suffix', () => {
      expect(truncate('Hello World', 9, '…')).toBe('Hello Wo…');
    });

    it('handles exact length', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
    });
  });
});
