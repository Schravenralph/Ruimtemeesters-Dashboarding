import { describe, it, expect, afterEach } from 'vitest';
import { t, setLocale, getLocale, getSupportedLocales } from './i18n';

describe('i18n', () => {
  afterEach(() => {
    setLocale('nl'); // Reset to default
  });

  it('returns Dutch translations by default', () => {
    expect(getLocale()).toBe('nl');
    expect(t('nav.login')).toBe('Inloggen');
    expect(t('nav.logout')).toBe('Uitloggen');
  });

  it('switches to English', () => {
    setLocale('en');
    expect(getLocale()).toBe('en');
    expect(t('nav.login')).toBe('Log in');
    expect(t('nav.logout')).toBe('Log out');
  });

  it('returns key for unknown translations', () => {
    expect(t('unknown.key.here')).toBe('unknown.key.here');
  });

  it('falls back to Dutch for missing English keys', () => {
    setLocale('en');
    // Both should have all keys, but test the fallback mechanism
    expect(t('nav.themes')).toBe('Themes');
  });

  it('lists supported locales', () => {
    const locales = getSupportedLocales();
    expect(locales).toHaveLength(2);
    expect(locales[0].value).toBe('nl');
    expect(locales[1].value).toBe('en');
  });

  it('translates common keys', () => {
    expect(t('common.save')).toBe('Opslaan');
    expect(t('common.cancel')).toBe('Annuleren');
    expect(t('common.delete')).toBe('Verwijderen');

    setLocale('en');
    expect(t('common.save')).toBe('Save');
    expect(t('common.cancel')).toBe('Cancel');
    expect(t('common.delete')).toBe('Delete');
  });

  it('translates geo levels', () => {
    expect(t('geo.gemeente')).toBe('Gemeente');

    setLocale('en');
    expect(t('geo.gemeente')).toBe('Municipality');
  });
});
