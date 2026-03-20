/**
 * URL utility functions.
 */

/**
 * Build a URL with query parameters.
 */
export function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return path;

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  }

  const qs = searchParams.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * Parse query parameters from a URL string.
 */
export function parseQueryParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const searchParams = new URL(url, 'http://localhost').searchParams;
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

/**
 * Get the current path without query string.
 */
export function getBasePath(url: string): string {
  return url.split('?')[0].split('#')[0];
}

/**
 * Check if a URL is external.
 */
export function isExternalUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}
