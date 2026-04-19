export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  const escaped = str.replace(/"/g, '""');
  if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) return `"${escaped}"`;
  return escaped;
}
