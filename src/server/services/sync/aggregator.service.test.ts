import { describe, it, expect } from 'vitest';
import { _internals } from './aggregator.service';

const { cronIntervalMinutes, compareCronStrictness, strictestCron, applyCap } = _internals;

describe('cronIntervalMinutes — common 5-field patterns', () => {
  it('every 5 minutes → 5', () => expect(cronIntervalMinutes('*/5 * * * *')).toBe(5));
  it('every minute → 1', () => expect(cronIntervalMinutes('* * * * *')).toBe(1));
  it('hourly at :00 → 60', () => expect(cronIntervalMinutes('0 * * * *')).toBe(60));
  it('every 2 hours → 120', () => expect(cronIntervalMinutes('0 */2 * * *')).toBe(120));
  it('daily at 06:00 → 1440', () => expect(cronIntervalMinutes('0 6 * * *')).toBe(1440));
  it('weekly Monday 06:00 → 10080', () => expect(cronIntervalMinutes('0 6 * * 1')).toBe(10080));
  it('monthly day-1 00:00 → 43200', () => expect(cronIntervalMinutes('0 0 1 * *')).toBe(43200));
  it('unknown pattern → Infinity', () => expect(cronIntervalMinutes('0 6 1,15 * *')).toBe(Infinity));
});

describe('compareCronStrictness', () => {
  it('hourly is stricter than daily', () =>
    expect(compareCronStrictness('0 * * * *', '0 6 * * *')).toBeLessThan(0));
  it('daily is stricter than weekly', () =>
    expect(compareCronStrictness('0 6 * * *', '0 6 * * 1')).toBeLessThan(0));
  it('equal patterns compare equal', () =>
    expect(compareCronStrictness('0 6 * * *', '0 6 * * *')).toBe(0));
});

describe('strictestCron', () => {
  it('picks the smallest interval', () =>
    expect(strictestCron(['0 6 * * *', '0 * * * *', '0 6 * * 1'])).toBe('0 * * * *'));
  it('returns null for empty list', () =>
    expect(strictestCron([])).toBe(null));
  it('first wins on ties (stability)', () =>
    expect(strictestCron(['0 6 * * *', '0 6 * * *'])).toBe('0 6 * * *'));
});

describe('applyCap — guardrail for most-strict-wins', () => {
  it('no cap: chosen passes through unchanged', () =>
    expect(applyCap('0 * * * *', null)).toEqual({ effective: '0 * * * *', cappedAt: null }));
  it('chosen looser than cap: chosen passes through', () =>
    expect(applyCap('0 6 * * *', '0 * * * *')).toEqual({ effective: '0 6 * * *', cappedAt: null }));
  it('chosen equals cap: chosen passes through, no clip', () =>
    expect(applyCap('0 6 * * *', '0 6 * * *')).toEqual({ effective: '0 6 * * *', cappedAt: null }));
  it('chosen stricter than cap: cap is returned + cappedAt set', () =>
    expect(applyCap('0 * * * *', '0 6 * * *')).toEqual({ effective: '0 6 * * *', cappedAt: '0 6 * * *' }));
});
