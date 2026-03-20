import { describe, it, expect } from 'vitest';
import { signToken, verifyToken } from './jwt';

describe('JWT', () => {
  const testUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'admin',
  };

  it('signs and verifies a token', () => {
    const token = signToken(testUser);
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');

    const payload = verifyToken(token);
    expect(payload.userId).toBe('user-123');
    expect(payload.email).toBe('test@example.com');
    expect(payload.role).toBe('admin');
  });

  it('creates different tokens for different users', () => {
    const token1 = signToken(testUser);
    const token2 = signToken({ ...testUser, id: 'user-456' });
    expect(token1).not.toBe(token2);
  });

  it('throws on invalid token', () => {
    expect(() => verifyToken('invalid-token')).toThrow();
  });

  it('throws on tampered token', () => {
    const token = signToken(testUser);
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(() => verifyToken(tampered)).toThrow();
  });
});
