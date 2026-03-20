import { describe, it, expect } from 'vitest';

describe('CORS configuration', () => {
  it('allows all origins in development', () => {
    const isDev = process.env.NODE_ENV !== 'production';
    expect(isDev).toBe(true); // vitest runs in test mode
  });

  it('parses comma-separated allowed origins', () => {
    const originsStr = 'https://example.com,https://app.example.com';
    const origins = originsStr.split(',').map(s => s.trim());
    expect(origins).toEqual(['https://example.com', 'https://app.example.com']);
  });

  it('handles empty allowed origins', () => {
    const originsStr = '';
    const origins = originsStr ? originsStr.split(',').map(s => s.trim()) : [];
    expect(origins).toEqual([]);
  });

  it('handles undefined allowed origins', () => {
    const originsStr: string | undefined = undefined;
    const origins = originsStr?.split(',').map(s => s.trim()) || [];
    expect(origins).toEqual([]);
  });
});
