/**
 * Chart color palette system.
 * Provides consistent, accessible color schemes for data visualization.
 */

export const PALETTE = {
  primary: [
    '#3b82f6', // blue-500
    '#ef4444', // red-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#84cc16', // lime-500
    '#f97316', // orange-500
    '#6366f1', // indigo-500
  ],

  // Colorblind-safe palette
  accessible: [
    '#0077BB', // blue
    '#CC3311', // red
    '#009988', // teal
    '#EE7733', // orange
    '#33BBEE', // cyan
    '#EE3377', // magenta
    '#BBBBBB', // grey
    '#332288', // indigo
    '#44AA99', // green
    '#882255', // wine
  ],

  // Sequential blue palette (for choropleth/heatmap)
  sequential: [
    '#dbeafe',
    '#bfdbfe',
    '#93c5fd',
    '#60a5fa',
    '#3b82f6',
    '#2563eb',
    '#1d4ed8',
    '#1e40af',
  ],

  // Diverging palette (for comparison: red-white-blue)
  diverging: [
    '#b91c1c', '#dc2626', '#ef4444', '#fca5a5',
    '#f3f4f6', // center
    '#93c5fd', '#3b82f6', '#2563eb', '#1d4ed8',
  ],

  // Gender palette
  gender: {
    man: '#3b82f6',
    vrouw: '#ec4899',
  },

  // Data source colors
  sources: {
    bevolking: '#3b82f6',
    huishoudens: '#10b981',
    woningen: '#8b5cf6',
    woningtekort: '#f59e0b',
  },
} as const;

export function getChartColors(count: number, palette: 'primary' | 'accessible' = 'primary'): string[] {
  const colors = PALETTE[palette];
  if (count <= colors.length) return colors.slice(0, count);

  // Repeat colors if needed
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(colors[i % colors.length]);
  }
  return result;
}

export function getSequentialColor(value: number, min: number, max: number): string {
  const ratio = max > min ? (value - min) / (max - min) : 0;
  const index = Math.min(Math.floor(ratio * PALETTE.sequential.length), PALETTE.sequential.length - 1);
  return PALETTE.sequential[index];
}

export function getDivergingColor(value: number, center: number = 0): string {
  const palette = PALETTE.diverging;
  const mid = Math.floor(palette.length / 2);

  if (value === center) return palette[mid];
  if (value > center) {
    const ratio = Math.min(Math.abs(value) / 10, 1); // Normalize to ~10%
    const index = mid + Math.floor(ratio * (palette.length - mid - 1)) + 1;
    return palette[Math.min(index, palette.length - 1)];
  } else {
    const ratio = Math.min(Math.abs(value) / 10, 1);
    const index = mid - Math.floor(ratio * mid) - 1;
    return palette[Math.max(index, 0)];
  }
}
