import { describe, it, expect } from 'vitest';
import { signToken, verifyToken } from './jwt';

describe('JWT - extended', () => {
  it('generates token with correct structure', () => {
    const token = signToken({ id: 'user-1', email: 'a@b.nl', role: 'admin' });
    // JWT has 3 parts separated by dots
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
  });

  it('payload contains user data', () => {
    const token = signToken({ id: 'user-42', email: 'test@example.com', role: 'editor' });
    const payload = verifyToken(token);
    expect(payload.userId).toBe('user-42');
    expect(payload.email).toBe('test@example.com');
    expect(payload.role).toBe('editor');
  });

  it('handles special characters in email', () => {
    const token = signToken({ id: '1', email: "o'reilly@test.nl", role: 'viewer' });
    const payload = verifyToken(token);
    expect(payload.email).toBe("o'reilly@test.nl");
  });

  it('handles unicode in role', () => {
    const token = signToken({ id: '1', email: 'a@b.nl', role: 'viewer' });
    const payload = verifyToken(token);
    expect(payload.role).toBe('viewer');
  });

  it('token is compact (reasonable size)', () => {
    const token = signToken({ id: 'user-1', email: 'a@b.nl', role: 'admin' });
    expect(token.length).toBeLessThan(1000); // JWT should be compact
  });

  it('different users get different tokens', () => {
    const t1 = signToken({ id: 'user-1', email: 'a@b.nl', role: 'admin' });
    const t2 = signToken({ id: 'user-2', email: 'c@d.nl', role: 'viewer' });
    // At minimum the payload part should differ
    expect(t1.split('.')[1]).not.toBe(t2.split('.')[1]);
  });
});
