import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Test rate limit logic without Express dependency
describe('rate limit logic', () => {
  let store: Map<string, { count: number; resetAt: number }>;

  beforeEach(() => {
    store = new Map();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function checkLimit(key: string, max: number, windowMs: number): boolean {
    const now = Date.now();
    let entry = store.get(key);

    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;
    return entry.count <= max;
  }

  it('allows requests within limit', () => {
    expect(checkLimit('user1', 5, 60000)).toBe(true);
    expect(checkLimit('user1', 5, 60000)).toBe(true);
    expect(checkLimit('user1', 5, 60000)).toBe(true);
  });

  it('blocks requests exceeding limit', () => {
    for (let i = 0; i < 5; i++) {
      expect(checkLimit('user1', 5, 60000)).toBe(true);
    }
    expect(checkLimit('user1', 5, 60000)).toBe(false);
  });

  it('resets after window expires', () => {
    for (let i = 0; i < 5; i++) {
      checkLimit('user1', 5, 60000);
    }
    expect(checkLimit('user1', 5, 60000)).toBe(false);

    vi.advanceTimersByTime(60001);
    expect(checkLimit('user1', 5, 60000)).toBe(true);
  });

  it('tracks different keys independently', () => {
    for (let i = 0; i < 5; i++) {
      checkLimit('user1', 5, 60000);
    }
    expect(checkLimit('user1', 5, 60000)).toBe(false);
    expect(checkLimit('user2', 5, 60000)).toBe(true);
  });

  it('handles concurrent keys', () => {
    checkLimit('user1', 10, 60000);
    checkLimit('user2', 10, 60000);
    checkLimit('user3', 10, 60000);

    expect(store.size).toBe(3);
  });
});
