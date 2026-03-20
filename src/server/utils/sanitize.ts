/**
 * Input sanitization utilities for preventing XSS and injection attacks.
 */

/**
 * Strip HTML tags from a string.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Escape HTML entities for safe display.
 */
export function escapeHtml(input: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  };
  return input.replace(/[&<>"']/g, char => map[char] || char);
}

/**
 * Sanitize a string for use in SQL LIKE patterns.
 * Escapes %, _, and \ characters.
 */
export function sanitizeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, char => `\\${char}`);
}

/**
 * Truncate a string to a maximum length.
 */
export function truncate(input: string, maxLength: number, suffix: string = '...'): string {
  if (input.length <= maxLength) return input;
  return input.slice(0, maxLength - suffix.length) + suffix;
}
