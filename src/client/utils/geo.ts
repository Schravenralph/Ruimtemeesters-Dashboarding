/**
 * Geographic utility functions for the dashboard.
 */

export const GEO_LEVEL_ORDER = ['land', 'provincie', 'corop', 'gemeente', 'wijk', 'buurt'] as const;

export const GEO_LEVEL_LABELS: Record<string, string> = {
  land: 'Nederland',
  provincie: 'Provincie',
  corop: 'COROP-regio',
  gemeente: 'Gemeente',
  wijk: 'Wijk',
  buurt: 'Buurt',
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
