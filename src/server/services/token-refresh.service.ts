import { signToken, verifyToken, type JwtPayload } from '../auth/jwt.js';

/**
 * Token refresh service.
 * Handles token rotation for improved security.
 */

interface RefreshResult {
  token: string;
  expiresAt: Date;
}

/**
 * Refresh an existing token if it's still valid but approaching expiry.
 * Returns null if the token is invalid or already expired.
 */
export function refreshToken(currentToken: string): RefreshResult | null {
  try {
    const payload = verifyToken(currentToken);

    // Create new token with same user info
    const newToken = signToken({
      id: payload.userId,
      email: payload.email,
      role: payload.role,
    });

    // Calculate expiry (24h from now)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    return { token: newToken, expiresAt };
  } catch {
    return null;
  }
}

/**
 * Check if a token should be refreshed (less than 2 hours remaining).
 */
export function shouldRefresh(token: string): boolean {
  try {
    const payload = verifyToken(token) as JwtPayload & { exp?: number };
    if (!payload.exp) return false;

    const expiresAt = payload.exp * 1000; // JWT exp is in seconds
    const twoHoursMs = 2 * 60 * 60 * 1000;

    return expiresAt - Date.now() < twoHoursMs;
  } catch {
    return false;
  }
}
