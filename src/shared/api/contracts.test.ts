import { describe, it, expect } from 'vitest';
import {
  ChartType, GeoLevel, TileConfig, ThemeConfig, FilterState,
  DataPoint, User, AccessPolicy, LoginRequest, DataQueryParams,
  CustomDashboard, ExportFormat, Role, PeriodSelection,
} from './contracts';

describe('contracts', () => {
  describe('ChartType', () => {
    it('accepts valid chart types', () => {
      expect(ChartType.parse('bar')).toBe('bar');
      expect(ChartType.parse('stacked-bar')).toBe('stacked-bar');
      expect(ChartType.parse('line')).toBe('line');
      expect(ChartType.parse('pie')).toBe('pie');
      expect(ChartType.parse('radar')).toBe('radar');
      expect(ChartType.parse('table')).toBe('table');
      expect(ChartType.parse('choropleth')).toBe('choropleth');
    });

    it('rejects invalid chart types', () => {
      expect(() => ChartType.parse('invalid')).toThrow();
    });
  });

  describe('GeoLevel', () => {
    it('accepts valid geo levels', () => {
      expect(GeoLevel.parse('land')).toBe('land');
      expect(GeoLevel.parse('provincie')).toBe('provincie');
      expect(GeoLevel.parse('gemeente')).toBe('gemeente');
      expect(GeoLevel.parse('wijk')).toBe('wijk');
      expect(GeoLevel.parse('buurt')).toBe('buurt');
    });
  });

  describe('Role', () => {
    it('accepts valid roles', () => {
      expect(Role.parse('admin')).toBe('admin');
      expect(Role.parse('editor')).toBe('editor');
      expect(Role.parse('viewer')).toBe('viewer');
      expect(Role.parse('guest')).toBe('guest');
    });
  });

  describe('TileConfig', () => {
    it('validates a valid tile config', () => {
      const tile = TileConfig.parse({
        id: 'tile-1',
        title: 'Bevolking naar leeftijd',
        chartType: 'bar',
        dataSource: 'bevolking',
        dimensions: ['age_group'],
        defaultGeoLevel: 'gemeente',
      });

      expect(tile.id).toBe('tile-1');
      expect(tile.chartType).toBe('bar');
      expect(tile.dimensions).toEqual(['age_group']);
    });

    it('applies defaults', () => {
      const tile = TileConfig.parse({
        id: 'tile-2',
        title: 'Test',
        chartType: 'line',
        dataSource: 'woningen',
      });

      expect(tile.dimensions).toEqual([]);
      expect(tile.defaultGeoLevel).toBe('gemeente');
      expect(tile.config).toEqual({});
    });
  });

  describe('FilterState', () => {
    it('has correct defaults', () => {
      const filters = FilterState.parse({});
      expect(filters.geoLevel).toBe('land');
      expect(filters.geoCode).toBe('NL');
      expect(filters.period.year).toBe(2024);
      expect(filters.period.compareYear).toBeNull();
      expect(filters.comparisonEnabled).toBe(false);
    });

    it('accepts full filter state', () => {
      const filters = FilterState.parse({
        geoLevel: 'gemeente',
        geoCode: 'GM0363',
        period: { year: 2025, compareYear: 2020 },
        dimensions: { age_group: '25-44' },
        comparisonEnabled: true,
      });

      expect(filters.geoCode).toBe('GM0363');
      expect(filters.period.compareYear).toBe(2020);
    });
  });

  describe('LoginRequest', () => {
    it('validates email and password', () => {
      const login = LoginRequest.parse({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(login.email).toBe('test@example.com');
    });

    it('rejects invalid email', () => {
      expect(() => LoginRequest.parse({
        email: 'not-an-email',
        password: 'password123',
      })).toThrow();
    });

    it('rejects short password', () => {
      expect(() => LoginRequest.parse({
        email: 'test@example.com',
        password: 'short',
      })).toThrow();
    });
  });

  describe('DataQueryParams', () => {
    it('coerces string numbers', () => {
      const params = DataQueryParams.parse({
        source: 'bevolking',
        year: '2024',
        limit: '100',
      });
      expect(params.year).toBe(2024);
      expect(params.limit).toBe(100);
    });
  });

  describe('AccessPolicy', () => {
    it('validates a policy with conditions', () => {
      const policy = AccessPolicy.parse({
        id: 'policy-1',
        name: 'Admin access',
        effect: 'allow',
        resource: 'theme:*',
        conditions: [
          { field: 'user.role', operator: 'eq', value: 'admin' },
        ],
      });

      expect(policy.conditions).toHaveLength(1);
      expect(policy.priority).toBe(0);
    });

    it('supports various operators', () => {
      const policy = AccessPolicy.parse({
        id: 'policy-2',
        name: 'Region restricted',
        effect: 'allow',
        resource: 'data:bevolking',
        conditions: [
          { field: 'user.attributes.region', operator: 'in', value: ['noord-holland', 'zuid-holland'] },
          { field: 'user.role', operator: 'neq', value: 'guest' },
        ],
        priority: 50,
      });

      expect(policy.conditions).toHaveLength(2);
      expect(policy.priority).toBe(50);
    });
  });

  describe('ExportFormat', () => {
    it('accepts valid formats', () => {
      expect(ExportFormat.parse('pdf')).toBe('pdf');
      expect(ExportFormat.parse('excel')).toBe('excel');
      expect(ExportFormat.parse('csv')).toBe('csv');
      expect(ExportFormat.parse('png')).toBe('png');
    });
  });
});
