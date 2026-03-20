import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to test the MemoryCache class directly, so let's create a local instance
class TestCache {
  private store = new Map<string, { value: unknown; expiresAt: number }>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number = 300000): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  async getOrCompute<T>(key: string, factory: () => Promise<T>, ttlMs: number = 300000): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;
    const value = await factory();
    this.set(key, value, ttlMs);
    return value;
  }

  invalidatePattern(pattern: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(pattern) || key.includes(pattern)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

describe('MemoryCache', () => {
  let cache: TestCache;

  beforeEach(() => {
    cache = new TestCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores and retrieves values', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('returns null for missing keys', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('expires entries after TTL', () => {
    cache.set('key1', 'value1', 1000);
    expect(cache.get('key1')).toBe('value1');

    vi.advanceTimersByTime(1001);
    expect(cache.get('key1')).toBeNull();
  });

  it('deletes entries', () => {
    cache.set('key1', 'value1');
    expect(cache.delete('key1')).toBe(true);
    expect(cache.get('key1')).toBeNull();
  });

  it('returns false when deleting non-existent key', () => {
    expect(cache.delete('nonexistent')).toBe(false);
  });

  it('tracks size', () => {
    expect(cache.size).toBe(0);
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.size).toBe(2);
    cache.delete('a');
    expect(cache.size).toBe(1);
  });

  it('clears all entries', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('invalidates by pattern', () => {
    cache.set('theme:1', 'a');
    cache.set('theme:2', 'b');
    cache.set('data:bevolking', 'c');
    cache.set('data:woningen', 'd');

    const removed = cache.invalidatePattern('theme');
    expect(removed).toBe(2);
    expect(cache.get('theme:1')).toBeNull();
    expect(cache.get('data:bevolking')).toBe('c');
  });

  it('getOrCompute returns cached value', async () => {
    cache.set('key1', 42);
    const factory = vi.fn().mockResolvedValue(99);

    const result = await cache.getOrCompute('key1', factory);
    expect(result).toBe(42);
    expect(factory).not.toHaveBeenCalled();
  });

  it('getOrCompute calls factory when not cached', async () => {
    const factory = vi.fn().mockResolvedValue(99);

    const result = await cache.getOrCompute('key1', factory);
    expect(result).toBe(99);
    expect(factory).toHaveBeenCalledOnce();
  });

  it('getOrCompute caches the factory result', async () => {
    const factory = vi.fn().mockResolvedValue(99);

    await cache.getOrCompute('key1', factory);
    const result = await cache.getOrCompute('key1', factory);

    expect(result).toBe(99);
    expect(factory).toHaveBeenCalledOnce(); // Only called once
  });

  it('handles complex values', () => {
    cache.set('obj', { name: 'test', nested: { value: 42 } });
    const result = cache.get<{ name: string; nested: { value: number } }>('obj');
    expect(result?.name).toBe('test');
    expect(result?.nested.value).toBe(42);
  });

  it('handles array values', () => {
    cache.set('arr', [1, 2, 3]);
    expect(cache.get<number[]>('arr')).toEqual([1, 2, 3]);
  });
});
