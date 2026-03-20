import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Extended metrics tests using a minimal implementation
class MinimalMetrics {
  private counters = new Map<string, number>();
  private histograms = new Map<string, number[]>();

  increment(name: string, amount = 1) { this.counters.set(name, (this.counters.get(name) || 0) + amount); }
  getCounter(name: string) { return this.counters.get(name) || 0; }
  recordDuration(name: string, ms: number) {
    if (!this.histograms.has(name)) this.histograms.set(name, []);
    this.histograms.get(name)!.push(ms);
    if (this.histograms.get(name)!.length > 1000) this.histograms.get(name)!.splice(0, 1);
  }
  getHistogram(name: string) {
    const vals = this.histograms.get(name);
    if (!vals?.length) return null;
    const sorted = [...vals].sort((a, b) => a - b);
    return {
      count: sorted.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length),
    };
  }
  reset() { this.counters.clear(); this.histograms.clear(); }
}

describe('metrics - extended', () => {
  let metrics: MinimalMetrics;

  beforeEach(() => { metrics = new MinimalMetrics(); });

  it('handles rapid increments', () => {
    for (let i = 0; i < 1000; i++) metrics.increment('rapid');
    expect(metrics.getCounter('rapid')).toBe(1000);
  });

  it('handles large duration values', () => {
    metrics.recordDuration('slow', 30000); // 30 seconds
    const stats = metrics.getHistogram('slow');
    expect(stats!.max).toBe(30000);
  });

  it('limits histogram to 1000 entries', () => {
    for (let i = 0; i < 1500; i++) metrics.recordDuration('overflow', i);
    const stats = metrics.getHistogram('overflow');
    expect(stats!.count).toBeLessThanOrEqual(1000);
  });

  it('handles zero duration', () => {
    metrics.recordDuration('instant', 0);
    const stats = metrics.getHistogram('instant');
    expect(stats!.min).toBe(0);
  });

  it('handles negative increment (decrement)', () => {
    metrics.increment('counter', 10);
    metrics.increment('counter', -3);
    expect(metrics.getCounter('counter')).toBe(7);
  });

  it('calculates correct average', () => {
    metrics.recordDuration('avg_test', 10);
    metrics.recordDuration('avg_test', 20);
    metrics.recordDuration('avg_test', 30);
    const stats = metrics.getHistogram('avg_test');
    expect(stats!.avg).toBe(20);
  });
});
