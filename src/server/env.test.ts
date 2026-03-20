import { describe, it, expect } from 'vitest';
import { env } from './env';

describe('env configuration', () => {
  it('has a port configured', () => {
    expect(env.port).toBeGreaterThan(0);
  });

  it('has database config', () => {
    expect(env.db.host).toBeTruthy();
    expect(env.db.port).toBeGreaterThan(0);
    expect(env.db.name).toBeTruthy();
  });

  it('has JWT config', () => {
    expect(env.jwt.secret).toBeTruthy();
    expect(env.jwt.expiry).toBeTruthy();
  });

  it('has node env', () => {
    expect(['development', 'test', 'production']).toContain(env.nodeEnv);
  });
});
