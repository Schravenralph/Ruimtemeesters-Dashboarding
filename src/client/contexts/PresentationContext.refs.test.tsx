import { describe, it, expect } from 'vitest';
import { DEFAULT_REFERENCE_VISIBILITY } from './PresentationContext';

describe('PresentationContext — DEFAULT_REFERENCE_VISIBILITY', () => {
  it('defaults all three reference series ON', () => {
    expect(DEFAULT_REFERENCE_VISIBILITY.cohort).toBe(true);
    expect(DEFAULT_REFERENCE_VISIBILITY.provincie).toBe(true);
    expect(DEFAULT_REFERENCE_VISIBILITY.land).toBe(true);
  });

  it('defaults envelope OFF (opt-in only)', () => {
    expect(DEFAULT_REFERENCE_VISIBILITY.envelope).toBe(false);
  });

  it('leaves cohortType undefined (use per-supercategory default)', () => {
    expect(DEFAULT_REFERENCE_VISIBILITY.cohortType).toBeUndefined();
  });
});
