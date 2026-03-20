import { describe, it, expect, afterEach } from 'vitest';
import { t, setLocale, getLocale, getSupportedLocales } from './i18n';

describe('i18n - comprehensive', () => {
  afterEach(() => setLocale('nl'));

  describe('Dutch translations completeness', () => {
    const requiredKeys = [
      'nav.themes', 'nav.myDashboards', 'nav.admin', 'nav.login', 'nav.logout',
      'dashboard.loading', 'dashboard.notFound', 'dashboard.downloadAll',
      'filters.title', 'filters.geoLevel', 'filters.period', 'filters.compare',
      'chart.loading', 'chart.noData', 'chart.expand',
      'export.csv', 'export.pdf', 'export.excel', 'export.png',
      'admin.title', 'admin.policies', 'admin.users',
      'auth.login', 'auth.register', 'auth.email', 'auth.password',
      'common.save', 'common.cancel', 'common.delete', 'common.loading',
    ];

    it('has all required Dutch translations', () => {
      for (const key of requiredKeys) {
        const value = t(key);
        expect(value).not.toBe(key); // Should not fall back to key
      }
    });

    it('has all required English translations', () => {
      setLocale('en');
      for (const key of requiredKeys) {
        const value = t(key);
        expect(value).not.toBe(key);
      }
    });
  });

  describe('locale switching', () => {
    it('switches NL to EN', () => {
      expect(t('common.save')).toBe('Opslaan');
      setLocale('en');
      expect(t('common.save')).toBe('Save');
    });

    it('switches EN back to NL', () => {
      setLocale('en');
      expect(t('common.save')).toBe('Save');
      setLocale('nl');
      expect(t('common.save')).toBe('Opslaan');
    });

    it('maintains locale state', () => {
      setLocale('en');
      expect(getLocale()).toBe('en');
      setLocale('nl');
      expect(getLocale()).toBe('nl');
    });
  });

  describe('supported locales', () => {
    it('includes NL and EN', () => {
      const locales = getSupportedLocales();
      expect(locales.map(l => l.value)).toContain('nl');
      expect(locales.map(l => l.value)).toContain('en');
    });

    it('has human-readable labels', () => {
      const locales = getSupportedLocales();
      expect(locales.find(l => l.value === 'nl')!.label).toBe('Nederlands');
      expect(locales.find(l => l.value === 'en')!.label).toBe('English');
    });
  });
});
