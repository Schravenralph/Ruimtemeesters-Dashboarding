import { describe, it, expect } from 'vitest';
import { pickActiveCohortType } from './CohortToggles';

describe('pickActiveCohortType — per-theme default + graceful fallback', () => {
  it('uses the user override when set, ignoring configured default and availability', () => {
    expect(pickActiveCohortType('stedelijkheid', 'woningmarktregio', ['populatiegrootte', 'stedelijkheid'])).toEqual({
      active: 'stedelijkheid', fellBack: false,
    });
  });

  it('uses the configured default when data is available', () => {
    expect(pickActiveCohortType(undefined, 'woningmarktregio', ['populatiegrootte', 'woningmarktregio'])).toEqual({
      active: 'woningmarktregio', fellBack: false,
    });
  });

  it('falls back to populatiegrootte when the configured default has no data', () => {
    // Wonen theme defaults to woningmarktregio; data not loaded; populatiegrootte present
    expect(pickActiveCohortType(undefined, 'woningmarktregio', ['populatiegrootte'])).toEqual({
      active: 'populatiegrootte', fellBack: true,
    });
  });

  it('does not flag fellBack when the configured default IS populatiegrootte', () => {
    expect(pickActiveCohortType(undefined, 'populatiegrootte', ['populatiegrootte'])).toEqual({
      active: 'populatiegrootte', fellBack: false,
    });
  });

  it('falls back even when nothing is available (degenerate but should not crash)', () => {
    expect(pickActiveCohortType(undefined, 'woningmarktregio', [])).toEqual({
      active: 'populatiegrootte', fellBack: true,
    });
  });
});
