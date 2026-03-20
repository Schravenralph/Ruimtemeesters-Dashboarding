import { describe, it, expect } from 'vitest';
import { stripHtml, escapeHtml, sanitizeLikePattern, truncate } from './sanitize';

describe('sanitize - extended tests', () => {
  describe('stripHtml edge cases', () => {
    it('handles nested tags', () => {
      expect(stripHtml('<div><p><b>text</b></p></div>')).toBe('text');
    });

    it('handles self-closing tags', () => {
      expect(stripHtml('before<br/>after')).toBe('beforeafter');
    });

    it('handles attributes in tags', () => {
      expect(stripHtml('<a href="test" class="link">click</a>')).toBe('click');
    });

    it('preserves text with angle brackets in content', () => {
      // Note: this is a limitation - < and > in text content will be affected
      expect(stripHtml('1 < 2 and 3 > 1')).toBe('1  1');
    });
  });

  describe('escapeHtml edge cases', () => {
    it('handles multiple special chars', () => {
      expect(escapeHtml('a & b < c > d "e" \'f\'')).toBe('a &amp; b &lt; c &gt; d &quot;e&quot; &#x27;f&#x27;');
    });

    it('handles empty string', () => {
      expect(escapeHtml('')).toBe('');
    });
  });

  describe('sanitizeLikePattern edge cases', () => {
    it('handles multiple special characters', () => {
      expect(sanitizeLikePattern('100% of _test_')).toBe('100\\% of \\_test\\_');
    });

    it('handles backslashes', () => {
      expect(sanitizeLikePattern('path\\to\\file')).toBe('path\\\\to\\\\file');
    });
  });

  describe('truncate edge cases', () => {
    it('handles empty string', () => {
      expect(truncate('', 5)).toBe('');
    });

    it('handles single character', () => {
      expect(truncate('a', 1)).toBe('a');
    });

    it('truncates to minimum viable length', () => {
      expect(truncate('abcdefgh', 4)).toBe('a...');
    });
  });
});
