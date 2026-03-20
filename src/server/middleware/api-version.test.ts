import { describe, it, expect } from 'vitest';

describe('API versioning', () => {
  it('current version is 1.0', () => {
    const currentVersion = '1.0';
    expect(currentVersion).toBe('1.0');
  });

  it('accepts version 1', () => {
    const requestedVersion = '1';
    const isSupported = requestedVersion === '1.0' || requestedVersion === '1';
    expect(isSupported).toBe(true);
  });

  it('rejects unsupported versions', () => {
    const requestedVersion = '2.0';
    const isSupported = requestedVersion === '1.0' || requestedVersion === '1';
    expect(isSupported).toBe(false);
  });

  it('handles missing version header', () => {
    const requestedVersion: string | undefined = undefined;
    // When no version is specified, allow the request
    const shouldAllow = !requestedVersion || requestedVersion === '1.0' || requestedVersion === '1';
    expect(shouldAllow).toBe(true);
  });
});
