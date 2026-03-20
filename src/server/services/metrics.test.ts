import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsCollector } from './metrics-testable';

// Test a standalone MetricsCollector instance
class TestMetrics {
  private counters = new Map<string, number>();
  private histograms = new Map<string, number[]>();

  increment(name: string, amount = 1) {
    this.counters.set(name, (this.counters.get(name) || 0) + amount);
  }

  getCounter(name: string) { return this.counters.get(name) || 0; }

  recordDuration(name: string, ms: number) {
    if (!this.histograms.has(name)) this.histograms.set(name, []);
    this.histograms.get(name)!.push(ms);
  }

  getHistogram(name: string) {
    const values = this.histograms.get(name);
    if (!values || values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;
    return {
      count,
      avg: Math.round(sorted.reduce((a, b) => a + b, 0) / count),
      min: sorted[0],
      max: sorted[count - 1],
      p50: sorted[Math.floor(count * 0.5)],
      p95: sorted[Math.floor(count * 0.95)],
    };
  }

  reset() { this.counters.clear(); this.histograms.clear(); }
}

describe('MetricsCollector', () => {
  let metrics: TestMetrics;

  beforeEach(() => {
    metrics = new TestMetrics();
  });

  describe('counters', () => {
    it('starts at zero', () => {
      expect(metrics.getCounter('test')).toBe(0);
    });

    it('increments by 1', () => {
      metrics.increment('requests');
      metrics.increment('requests');
      expect(metrics.getCounter('requests')).toBe(2);
    });

    it('increments by custom amount', () => {
      metrics.increment('bytes', 1024);
      metrics.increment('bytes', 2048);
      expect(metrics.getCounter('bytes')).toBe(3072);
    });

    it('tracks multiple counters independently', () => {
      metrics.increment('a', 5);
      metrics.increment('b', 10);
      expect(metrics.getCounter('a')).toBe(5);
      expect(metrics.getCounter('b')).toBe(10);
    });
  });

  describe('histograms', () => {
    it('returns null for empty histogram', () => {
      expect(metrics.getHistogram('nonexistent')).toBeNull();
    });

    it('calculates basic stats', () => {
      metrics.recordDuration('api', 10);
      metrics.recordDuration('api', 20);
      metrics.recordDuration('api', 30);

      const stats = metrics.getHistogram('api');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(3);
      expect(stats!.avg).toBe(20);
      expect(stats!.min).toBe(10);
      expect(stats!.max).toBe(30);
    });

    it('calculates percentiles', () => {
      for (let i = 1; i <= 100; i++) {
        metrics.recordDuration('response', i);
      }

      const stats = metrics.getHistogram('response');
      expect(stats!.p50).toBe(51);
      expect(stats!.p95).toBe(96);
    });
  });

  describe('reset', () => {
    it('clears all data', () => {
      metrics.increment('counter', 10);
      metrics.recordDuration('hist', 100);
      metrics.reset();

      expect(metrics.getCounter('counter')).toBe(0);
      expect(metrics.getHistogram('hist')).toBeNull();
    });
  });
});
