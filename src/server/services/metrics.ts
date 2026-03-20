/**
 * Application metrics tracking for monitoring.
 * Simple counter-based metrics without external dependencies.
 * In production, use Prometheus (prom-client) or similar.
 */

interface MetricValue {
  count: number;
  lastUpdated: Date;
}

class MetricsCollector {
  private counters = new Map<string, MetricValue>();
  private histograms = new Map<string, number[]>();

  increment(name: string, amount: number = 1): void {
    const existing = this.counters.get(name) || { count: 0, lastUpdated: new Date() };
    existing.count += amount;
    existing.lastUpdated = new Date();
    this.counters.set(name, existing);
  }

  recordDuration(name: string, durationMs: number): void {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, []);
    }
    const values = this.histograms.get(name)!;
    values.push(durationMs);

    // Keep last 1000 values
    if (values.length > 1000) {
      values.splice(0, values.length - 1000);
    }
  }

  getCounter(name: string): number {
    return this.counters.get(name)?.count || 0;
  }

  getHistogram(name: string): {
    count: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
  } | null {
    const values = this.histograms.get(name);
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;

    return {
      count,
      avg: Math.round(sorted.reduce((a, b) => a + b, 0) / count),
      p50: sorted[Math.floor(count * 0.5)],
      p95: sorted[Math.floor(count * 0.95)],
      p99: sorted[Math.floor(count * 0.99)],
      min: sorted[0],
      max: sorted[count - 1],
    };
  }

  getAllCounters(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [name, value] of this.counters) {
      result[name] = value.count;
    }
    return result;
  }

  getAllHistograms(): Record<string, ReturnType<MetricsCollector['getHistogram']>> {
    const result: Record<string, ReturnType<MetricsCollector['getHistogram']>> = {};
    for (const name of this.histograms.keys()) {
      result[name] = this.getHistogram(name);
    }
    return result;
  }

  reset(): void {
    this.counters.clear();
    this.histograms.clear();
  }
}

export const metrics = new MetricsCollector();

// Common metric names
export const METRICS = {
  // Request counters
  HTTP_REQUESTS_TOTAL: 'http_requests_total',
  HTTP_ERRORS_TOTAL: 'http_errors_total',
  AUTH_LOGINS_TOTAL: 'auth_logins_total',
  AUTH_FAILURES_TOTAL: 'auth_failures_total',

  // Data operations
  DATA_QUERIES_TOTAL: 'data_queries_total',
  DATA_IMPORTS_TOTAL: 'data_imports_total',
  DATA_EXPORTS_TOTAL: 'data_exports_total',

  // Dashboard operations
  DASHBOARD_VIEWS_TOTAL: 'dashboard_views_total',
  DASHBOARD_CREATES_TOTAL: 'dashboard_creates_total',
  DASHBOARD_SHARES_TOTAL: 'dashboard_shares_total',

  // Response times
  HTTP_RESPONSE_TIME: 'http_response_time_ms',
  DB_QUERY_TIME: 'db_query_time_ms',
} as const;
