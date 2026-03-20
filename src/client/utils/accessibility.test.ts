import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateAriaId } from './accessibility';

describe('accessibility utilities', () => {
  describe('generateAriaId', () => {
    it('generates unique IDs', () => {
      const id1 = generateAriaId('test');
      const id2 = generateAriaId('test');
      expect(id1).not.toBe(id2);
    });

    it('uses prefix', () => {
      const id = generateAriaId('modal');
      expect(id).toMatch(/^modal-\d+$/);
    });

    it('uses default prefix', () => {
      const id = generateAriaId();
      expect(id).toMatch(/^aria-\d+$/);
    });
  });
});
