import { describe, it, expect } from 'vitest';
import { appConfig } from './app';

describe('appConfig', () => {
  it('has correct app name', () => {
    expect(appConfig.name).toBe('Ruimtemeesters Dashboard');
  });

  it('has correct version', () => {
    expect(appConfig.version).toBe('0.1.0');
  });

  it('has valid rate limit config', () => {
    expect(appConfig.rateLimiting.global.max).toBeGreaterThan(0);
    expect(appConfig.rateLimiting.auth.max).toBeGreaterThan(0);
    expect(appConfig.rateLimiting.auth.max).toBeLessThan(appConfig.rateLimiting.global.max);
  });

  it('has data limits', () => {
    expect(appConfig.data.maxExportRows).toBe(50000);
    expect(appConfig.data.maxImportRows).toBe(50000);
    expect(appConfig.data.defaultQueryLimit).toBe(1000);
  });

  it('has dashboard limits', () => {
    expect(appConfig.dashboards.maxCustomPerUser).toBe(5);
    expect(appConfig.dashboards.shareLinkExpiryDays).toBe(30);
  });

  it('has geo levels', () => {
    expect(appConfig.geo.levels).toContain('land');
    expect(appConfig.geo.levels).toContain('gemeente');
    expect(appConfig.geo.levels).toContain('corop');
    expect(appConfig.geo.defaultCode).toBe('NL');
  });

  it('has chart types', () => {
    expect(appConfig.charts.types).toContain('bar');
    expect(appConfig.charts.types).toContain('line');
    expect(appConfig.charts.types).toContain('choropleth');
    expect(appConfig.charts.types).toContain('pyramid');
  });

  it('has feature flags', () => {
    expect(appConfig.features.enableNotifications).toBe(true);
    expect(appConfig.features.enableDataImport).toBe(true);
    expect(appConfig.features.enableSearch).toBe(true);
  });

  it('has default colors', () => {
    expect(appConfig.charts.defaultColors).toHaveLength(10);
    expect(appConfig.charts.defaultColors[0]).toMatch(/^#[0-9a-f]{6}$/);
  });
});
