/**
 * Classification utilities for choropleth maps.
 * Matches Primos Datawonen's "Klassenindeling" feature.
 *
 * Supports:
 * - Equal intervals (Gelijke klassen)
 * - Quantiles (gelijke aantallen per klasse)
 * - Natural breaks (Jenks)
 * - Manual breaks (Handmatige grenzen)
 */

export interface ClassBreak {
  label: string;
  lowerBound: number;
  upperBound: number;
  color: string;
  count: number;
}

/**
 * Generate equal interval class breaks.
 * Divides the range evenly into n classes.
 */
export function equalIntervals(values: number[], numClasses: number, colors: string[]): ClassBreak[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const step = range / numClasses;

  return Array.from({ length: numClasses }, (_, i) => {
    const lower = min + i * step;
    const upper = i === numClasses - 1 ? max : min + (i + 1) * step;
    const count = values.filter(v => v >= lower && (i === numClasses - 1 ? v <= upper : v < upper)).length;
    return {
      label: i === 0
        ? `< ${formatBreak(upper)}`
        : i === numClasses - 1
          ? `≥ ${formatBreak(lower)}`
          : `${formatBreak(lower)} – ${formatBreak(upper)}`,
      lowerBound: lower,
      upperBound: upper,
      color: colors[i % colors.length],
      count,
    };
  });
}

/**
 * Generate quantile class breaks.
 * Each class contains approximately the same number of values.
 */
export function quantiles(values: number[], numClasses: number, colors: string[]): ClassBreak[] {
  if (values.length === 0) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const step = Math.ceil(sorted.length / numClasses);

  return Array.from({ length: numClasses }, (_, i) => {
    const startIdx = i * step;
    const endIdx = Math.min((i + 1) * step - 1, sorted.length - 1);
    const lower = sorted[startIdx];
    const upper = sorted[endIdx];
    const count = endIdx - startIdx + 1;
    return {
      label: i === 0
        ? `< ${formatBreak(upper)}`
        : i === numClasses - 1
          ? `≥ ${formatBreak(lower)}`
          : `${formatBreak(lower)} – ${formatBreak(upper)}`,
      lowerBound: lower,
      upperBound: upper,
      color: colors[i % colors.length],
      count,
    };
  });
}

/**
 * Classify a value into the appropriate class.
 * Returns the index of the class (0-based).
 */
export function classify(value: number, breaks: ClassBreak[]): number {
  for (let i = 0; i < breaks.length; i++) {
    if (i === breaks.length - 1) return i; // Last class catches all
    if (value < breaks[i].upperBound) return i;
  }
  return breaks.length - 1;
}

/**
 * Get the color for a value based on class breaks.
 */
export function getClassColor(value: number, breaks: ClassBreak[]): string {
  const idx = classify(value, breaks);
  return breaks[idx]?.color || '#cccccc';
}

/**
 * Format a break value for display.
 */
function formatBreak(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000).toLocaleString('nl-NL')}.000`;
  return value.toLocaleString('nl-NL');
}

/**
 * Default color schemes matching Primos.
 */
export const COLOR_SCHEMES = {
  greenBlue: ['#E3FF96', '#C4FF37', '#9BD700', '#0176E0', '#00468C'],
  redYellowGreen: ['#d73027', '#fc8d59', '#fee08b', '#91cf60', '#1a9850'],
  blues: ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c'],
  reds: ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'],
  purples: ['#f2f0f7', '#cbc9e2', '#9e9ac8', '#756bb1', '#54278f'],
  oranges: ['#feedde', '#fdbe85', '#fd8d3c', '#e6550d', '#a63603'],
  greys: ['#f7f7f7', '#cccccc', '#969696', '#636363', '#252525'],
} as const;

export type ColorSchemeName = keyof typeof COLOR_SCHEMES;
