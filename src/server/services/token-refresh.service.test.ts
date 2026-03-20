import { describe, it, expect } from 'vitest';
import { refreshToken, shouldRefresh } from './token-refresh.service';
import { signToken } from '../auth/jwt';

describe('token refresh service', () => {
  it('refreshes a valid token', () => {
    const token = signToken({ id: 'user-1', email: 'test@test.nl', role: 'viewer' });
    const result = refreshToken(token);
    expect(result).not.toBeNull();
    expect(result!.token).toBeTruthy();
    expect(result!.expiresAt).toBeInstanceOf(Date);
    expect(typeof result!.token).toBe('string'); // New token is a valid string
  });

  it('returns null for invalid token', () => {
    expect(refreshToken('invalid-token')).toBeNull();
  });

  it('returns null for empty token', () => {
    expect(refreshToken('')).toBeNull();
  });

  it('shouldRefresh returns false for fresh token', () => {
    const token = signToken({ id: 'user-1', email: 'test@test.nl', role: 'viewer' });
    // Fresh token should not need refresh (24h expiry, 2h threshold)
    expect(shouldRefresh(token)).toBe(false);
  });

  it('shouldRefresh returns false for invalid token', () => {
    expect(shouldRefresh('invalid')).toBe(false);
  });
});
