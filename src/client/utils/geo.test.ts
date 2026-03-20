import { describe, it, expect } from 'vitest';
import {
  getParentLevel,
  getChildLevel,
  isMunicipalityCode,
  isProvinceCode,
  getProvinceName,
  GEO_LEVEL_ORDER,
  PROVINCE_CODES,
} from './geo';

describe('geo utilities', () => {
  describe('getParentLevel', () => {
    it('returns null for land', () => {
      expect(getParentLevel('land')).toBeNull();
    });

    it('returns land for provincie', () => {
      expect(getParentLevel('provincie')).toBe('land');
    });

    it('returns provincie for gemeente', () => {
      expect(getParentLevel('gemeente')).toBe('corop');
    });

    it('returns null for unknown level', () => {
      expect(getParentLevel('unknown')).toBeNull();
    });
  });

  describe('getChildLevel', () => {
    it('returns provincie for land', () => {
      expect(getChildLevel('land')).toBe('provincie');
    });

    it('returns gemeente for corop', () => {
      expect(getChildLevel('corop')).toBe('gemeente');
    });

    it('returns null for buurt (lowest)', () => {
      expect(getChildLevel('buurt')).toBeNull();
    });
  });

  describe('isMunicipalityCode', () => {
    it('matches valid GM codes', () => {
      expect(isMunicipalityCode('GM0363')).toBe(true);
      expect(isMunicipalityCode('GM0599')).toBe(true);
    });

    it('rejects invalid codes', () => {
      expect(isMunicipalityCode('NL')).toBe(false);
      expect(isMunicipalityCode('NL-NH')).toBe(false);
      expect(isMunicipalityCode('GM123')).toBe(false);
      expect(isMunicipalityCode('GM12345')).toBe(false);
    });
  });

  describe('isProvinceCode', () => {
    it('matches valid province codes', () => {
      expect(isProvinceCode('NL-NH')).toBe(true);
      expect(isProvinceCode('NL-ZH')).toBe(true);
    });

    it('rejects invalid codes', () => {
      expect(isProvinceCode('NL')).toBe(false);
      expect(isProvinceCode('GM0363')).toBe(false);
      expect(isProvinceCode('NL-NHH')).toBe(false);
    });
  });

  describe('getProvinceName', () => {
    it('returns name for valid code', () => {
      expect(getProvinceName('NL-NH')).toBe('Noord-Holland');
      expect(getProvinceName('NL-ZH')).toBe('Zuid-Holland');
    });

    it('returns null for unknown code', () => {
      expect(getProvinceName('NL-XX')).toBeNull();
    });
  });

  describe('constants', () => {
    it('has correct level order', () => {
      expect(GEO_LEVEL_ORDER[0]).toBe('land');
      expect(GEO_LEVEL_ORDER[GEO_LEVEL_ORDER.length - 1]).toBe('buurt');
    });

    it('has 12 provinces', () => {
      expect(Object.keys(PROVINCE_CODES)).toHaveLength(12);
    });
  });
});
