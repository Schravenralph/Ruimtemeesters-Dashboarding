/**
 * Data transformations matching Primos Datawonen's "Transformaties" feature.
 *
 * Three transformation types:
 * 1. Percenteren — calculate percentages relative to a total
 * 2. Groeicijfers — calculate growth rates between periods
 * 3. Z-Scores — standardize values to z-scores
 */

import type { DataPoint } from '@shared/api/contracts';

/**
 * Percenteren: convert absolute values to percentages of total per geo area.
 * Each dimension value becomes (value / total_for_area) * 100.
 */
export function percenteren(data: DataPoint[]): DataPoint[] {
  // Group by geo+year to find totals
  const totals = new Map<string, number>();
  for (const d of data) {
    const key = `${d.geoCode}|${d.year}`;
    totals.set(key, (totals.get(key) || 0) + d.value);
  }

  return data.map(d => {
    const key = `${d.geoCode}|${d.year}`;
    const total = totals.get(key) || 1;
    return {
      ...d,
      value: Math.round((d.value / total) * 10000) / 100, // 2 decimal places
      label: d.label ? `${d.label} (%)` : undefined,
    };
  });
}

/**
 * Groeicijfers: calculate growth rates between consecutive periods.
 *
 * Types:
 * - 'absoluut': absolute change (value_t - value_t-1)
 * - 'relatief': relative change ((value_t - value_t-1) / value_t-1 * 100)
 * - 'index': index numbers (value_t / value_base * 100)
 */
export function groeicijfers(
  data: DataPoint[],
  type: 'absoluut' | 'relatief' | 'index' = 'relatief',
  baseYear?: number,
): DataPoint[] {
  // Group by geo+dimension
  const groups = new Map<string, DataPoint[]>();
  for (const d of data) {
    const key = `${d.geoCode}|${d.dimensionValue || ''}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  }

  const result: DataPoint[] = [];

  for (const points of groups.values()) {
    const sorted = [...points].sort((a, b) => a.year - b.year);
    const base = baseYear
      ? sorted.find(p => p.year === baseYear)
      : sorted[0];

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];

      if (type === 'index') {
        if (!base || base.value === 0) continue;
        result.push({
          ...current,
          value: Math.round((current.value / base.value) * 10000) / 100,
        });
      } else if (i === 0) {
        // First period has no previous — skip or set to 0
        result.push({ ...current, value: 0 });
      } else {
        const prev = sorted[i - 1];
        if (type === 'absoluut') {
          result.push({
            ...current,
            value: current.value - prev.value,
          });
        } else {
          // relatief
          const change = prev.value !== 0
            ? Math.round(((current.value - prev.value) / prev.value) * 10000) / 100
            : 0;
          result.push({ ...current, value: change });
        }
      }
    }
  }

  return result;
}

/**
 * Z-Scores: standardize values to z-scores ((value - mean) / stddev).
 * Calculated per period across all geographic areas.
 */
export function zScores(data: DataPoint[]): DataPoint[] {
  // Group by year+dimension
  const groups = new Map<string, DataPoint[]>();
  for (const d of data) {
    const key = `${d.year}|${d.dimensionValue || ''}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  }

  const result: DataPoint[] = [];

  for (const points of groups.values()) {
    const values = points.map(p => p.value);
    const n = values.length;
    if (n < 2) {
      result.push(...points.map(p => ({ ...p, value: 0 })));
      continue;
    }

    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1);
    const stddev = Math.sqrt(variance);

    if (stddev === 0) {
      result.push(...points.map(p => ({ ...p, value: 0 })));
      continue;
    }

    for (const p of points) {
      result.push({
        ...p,
        value: Math.round(((p.value - mean) / stddev) * 100) / 100,
      });
    }
  }

  return result;
}

export type TransformationType = 'none' | 'percenteren' | 'groeicijfers' | 'zscores';

export function applyTransformation(
  data: DataPoint[],
  type: TransformationType,
  options?: { groeicijferType?: 'absoluut' | 'relatief' | 'index'; baseYear?: number },
): DataPoint[] {
  switch (type) {
    case 'percenteren':
      return percenteren(data);
    case 'groeicijfers':
      return groeicijfers(data, options?.groeicijferType || 'relatief', options?.baseYear);
    case 'zscores':
      return zScores(data);
    default:
      return data;
  }
}
