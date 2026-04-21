/**
 * Geographic utility functions for the dashboard.
 */

// Strict parent → child drill-down hierarchy. Used by getParentLevel /
// getChildLevel for dashboard navigation. Deliberately a subset of all CBS
// geo levels: landsdeel (cross-cuts provincies) and postcode4/postcode6
// (cross-cut gemeenten) don't fit a clean parent/child chain.
export const GEO_LEVEL_ORDER = ['land', 'provincie', 'corop', 'gemeente', 'wijk', 'buurt'] as const;

// Labels for every CBS geo level the inspector can emit, including ones
// outside GEO_LEVEL_ORDER. Downstream UI that displays metadata geoLevels
// looks up labels here — keep it in sync with cbs-catalog-metadata.ts.
export const GEO_LEVEL_LABELS: Record<string, string> = {
  land: 'Nederland',
  landsdeel: 'Landsdeel',
  provincie: 'Provincie',
  corop: 'COROP-regio',
  gemeente: 'Gemeente',
  wijk: 'Wijk',
  buurt: 'Buurt',
  postcode4: 'Postcode (PC4)',
  postcode6: 'Postcode (PC6)',
};

export const PROVINCE_CODES: Record<string, string> = {
  'NL-GR': 'Groningen',
  'NL-FR': 'Fryslân',
  'NL-DR': 'Drenthe',
  'NL-OV': 'Overijssel',
  'NL-FL': 'Flevoland',
  'NL-GE': 'Gelderland',
  'NL-UT': 'Utrecht',
  'NL-NH': 'Noord-Holland',
  'NL-ZH': 'Zuid-Holland',
  'NL-ZE': 'Zeeland',
  'NL-NB': 'Noord-Brabant',
  'NL-LI': 'Limburg',
};

/**
 * Get the parent level for a given geo level.
 */
export function getParentLevel(level: string): string | null {
  const index = GEO_LEVEL_ORDER.indexOf(level as typeof GEO_LEVEL_ORDER[number]);
  if (index <= 0) return null;
  return GEO_LEVEL_ORDER[index - 1];
}

/**
 * Get the child level for a given geo level.
 */
export function getChildLevel(level: string): string | null {
  const index = GEO_LEVEL_ORDER.indexOf(level as typeof GEO_LEVEL_ORDER[number]);
  if (index < 0 || index >= GEO_LEVEL_ORDER.length - 1) return null;
  return GEO_LEVEL_ORDER[index + 1];
}

/**
 * Check if a geo code is a municipality code (GMxxxx format).
 */
export function isMunicipalityCode(code: string): boolean {
  return /^GM\d{4}$/.test(code);
}

/**
 * Check if a geo code is a province code (NL-XX format).
 */
export function isProvinceCode(code: string): boolean {
  return /^NL-[A-Z]{2}$/.test(code);
}

/**
 * Get the province name for a province code.
 */
export function getProvinceName(code: string): string | null {
  return PROVINCE_CODES[code] || null;
}
