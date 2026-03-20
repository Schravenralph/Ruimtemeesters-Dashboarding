import { describe, it, expect } from 'vitest';
import {
  ChartType, GeoLevel, Role, ExportFormat,
  TileConfig, ThemeConfig, FilterState, DataPoint,
  User, AccessPolicy, CustomDashboard, LayoutItem,
  PeriodSelection, Dimension, GeoArea, DataResponse,
  LoginRequest, AuthResponse, DataQueryParams,
} from './contracts';

/**
 * Verify that all contract types are properly exported and usable.
 * This serves as both a test and documentation of the public API.
 */
describe('contracts exports', () => {
  it('exports all enum schemas', () => {
    expect(ChartType).toBeDefined();
    expect(GeoLevel).toBeDefined();
    expect(Role).toBeDefined();
    expect(ExportFormat).toBeDefined();
  });

  it('ChartType includes all types', () => {
    const types = ChartType.options;
    expect(types).toContain('bar');
    expect(types).toContain('stacked-bar');
    expect(types).toContain('line');
    expect(types).toContain('pie');
    expect(types).toContain('radar');
    expect(types).toContain('table');
    expect(types).toContain('choropleth');
    expect(types).toContain('pyramid');
    expect(types.length).toBeGreaterThanOrEqual(8);
  });

  it('GeoLevel includes all levels', () => {
    const levels = GeoLevel.options;
    expect(levels).toContain('land');
    expect(levels).toContain('provincie');
    expect(levels).toContain('corop');
    expect(levels).toContain('gemeente');
    expect(levels).toContain('wijk');
    expect(levels).toContain('buurt');
  });

  it('Role includes all roles', () => {
    expect(Role.options).toEqual(['admin', 'editor', 'viewer', 'guest']);
  });

  it('ExportFormat includes all formats', () => {
    expect(ExportFormat.options).toEqual(['pdf', 'excel', 'csv', 'png']);
  });

  it('validates a complete TileConfig', () => {
    const tile = TileConfig.parse({
      id: 'test-tile',
      title: 'Test Tile',
      chartType: 'bar',
      dataSource: 'bevolking',
      dimensions: ['age_group'],
      defaultGeoLevel: 'gemeente',
      description: 'Test description',
      config: { color: '#blue' },
    });
    expect(tile.id).toBe('test-tile');
    expect(tile.config).toEqual({ color: '#blue' });
  });

  it('validates a complete User', () => {
    const user = User.parse({
      id: 'user-1',
      email: 'test@test.nl',
      name: 'Test User',
      role: 'viewer',
      organizationId: null,
      attributes: { region: 'noord-holland' },
      createdAt: '2024-01-01',
    });
    expect(user.role).toBe('viewer');
    expect(user.attributes.region).toBe('noord-holland');
  });

  it('validates LayoutItem', () => {
    const item = LayoutItem.parse({
      i: 'tile-1',
      x: 0,
      y: 0,
      w: 6,
      h: 4,
    });
    expect(item.w).toBe(6);
  });

  it('validates PeriodSelection defaults', () => {
    const period = PeriodSelection.parse({ year: 2024 });
    expect(period.compareYear).toBeNull();
  });
});
