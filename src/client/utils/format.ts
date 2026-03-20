/**
 * Format a number using Dutch locale conventions.
 */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat('nl-NL', options).format(value);
}

/**
 * Format a number with compact notation (e.g., 1.5M, 23K).
 */
export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return String(Math.round(value));
}

/**
 * Format a percentage value.
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

/**
 * Format a date for Dutch locale.
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

/**
 * Format a datetime for Dutch locale.
 */
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/**
 * Convert a dimension key to a human-readable label.
 */
export function dimensionLabel(key: string): string {
  const labels: Record<string, string> = {
    age_group: 'Leeftijdsgroep',
    gender: 'Geslacht',
    household_type: 'Type huishouden',
    tenure_type: 'Eigendomsvorm',
    dwelling_type: 'Woningtype',
    metric: 'Indicator',
  };
  return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Convert a dimension value to a human-readable label.
 */
export function dimensionValueLabel(value: string): string {
  const labels: Record<string, string> = {
    man: 'Man',
    vrouw: 'Vrouw',
    eenpersoons: 'Eenpersoons',
    paar_zonder_kinderen: 'Paar zonder kinderen',
    paar_met_kinderen: 'Paar met kinderen',
    eenouder: 'Eenoudergezin',
    overig: 'Overig',
    eigendom: 'Koopwoning',
    huur_sociaal: 'Sociale huur',
    huur_particulier: 'Particuliere huur',
    eengezins: 'Eengezinswoning',
    meergezins: 'Meergezinswoning',
    tekort: 'Woningtekort',
    vraag: 'Woningvraag',
    aanbod: 'Woningaanbod',
  };
  return labels[value] || value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
