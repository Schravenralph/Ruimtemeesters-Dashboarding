/**
 * Check if a data source string indicates prognose (forecast) data.
 * Single source of truth — used by LineChart, MiniChart, TrendSummary, DataTable.
 */
export function isPrognoseSource(source?: string): boolean {
  return source === 'cbs_prognose' || source === 'ruimtemeesters_prognose';
}
