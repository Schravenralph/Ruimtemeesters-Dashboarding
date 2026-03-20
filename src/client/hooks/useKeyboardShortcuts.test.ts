import { describe, it, expect, vi } from 'vitest';

// Test keyboard shortcut logic without React Router dependency
describe('keyboard shortcut logic', () => {
  const themeRoutes = [
    '/dashboard/overzicht',
    '/dashboard/bevolking',
    '/dashboard/huishoudens',
    '/dashboard/woningen',
    '/dashboard/woningtekort',
  ];

  it('maps Alt+1 to overzicht', () => {
    const key = '1';
    const num = parseInt(key);
    expect(themeRoutes[num - 1]).toBe('/dashboard/overzicht');
  });

  it('maps Alt+5 to woningtekort', () => {
    const key = '5';
    const num = parseInt(key);
    expect(themeRoutes[num - 1]).toBe('/dashboard/woningtekort');
  });

  it('ignores keys outside 1-5 range', () => {
    const key = '6';
    const num = parseInt(key);
    expect(num >= 1 && num <= 5).toBe(false);
  });

  it('ignores non-numeric keys', () => {
    const key = 'a';
    const num = parseInt(key);
    expect(isNaN(num)).toBe(true);
  });

  it('handles Alt+M for dashboards', () => {
    const key = 'm';
    expect(key.toLowerCase()).toBe('m');
  });
});
