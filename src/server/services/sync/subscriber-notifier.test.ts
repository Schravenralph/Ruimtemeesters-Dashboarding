import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

interface DbState {
  subscribers: Array<{ subscriber_kind: 'user' | 'project_dashboard'; subscriber_id: string; notification_pref: { email: boolean; in_app: boolean; events: string[] } }>;
  users: Array<{ id: string; email: string | null }>;
  dashboardOwners: Array<{ dashboard_id: string; owner_id: string | null; owner_email: string | null }>;
}

const mocks = vi.hoisted(() => {
  const dbState: DbState = { subscribers: [], users: [], dashboardOwners: [] };
  const queryMock = vi.fn(async (sql: string) => {
    if (/FROM sync_subscribers/.test(sql)) return { rows: dbState.subscribers, rowCount: dbState.subscribers.length };
    if (/FROM users WHERE id = ANY/.test(sql)) return { rows: dbState.users, rowCount: dbState.users.length };
    if (/FROM project_dashboards/.test(sql)) return { rows: dbState.dashboardOwners, rowCount: dbState.dashboardOwners.length };
    return { rows: [], rowCount: 0 };
  });
  const createNotificationMock = vi.fn(async () => 'notif-id');
  const emailSendMock = vi.fn(async () => undefined);
  return { dbState, queryMock, createNotificationMock, emailSendMock };
});

vi.mock('../../db/pool.js', () => ({
  pool: {} as unknown,
  query: mocks.queryMock,
  getClient: vi.fn(),
}));

vi.mock('../notification.service.js', () => ({ createNotification: mocks.createNotificationMock }));

vi.mock('../email.service.js', () => ({ getEmailService: () => ({ send: mocks.emailSendMock }) }));

import { notifySubscribers, filterAndDedup, formatSubscriberNotification } from './subscriber-notifier';

const { dbState, queryMock, createNotificationMock, emailSendMock } = mocks;

beforeEach(() => {
  dbState.subscribers = [];
  dbState.users = [];
  dbState.dashboardOwners = [];
  queryMock.mockClear();
  createNotificationMock.mockClear();
  emailSendMock.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('filterAndDedup', () => {
  it('drops subscribers whose pref.events does not contain the firing event', () => {
    const recipients = [
      { userId: 'u1', email: 'a@x.com', pref: { email: false, in_app: true, events: ['data_arrived'] } },
      { userId: 'u2', email: 'b@x.com', pref: { email: false, in_app: true, events: ['frequency_changed'] } },
    ];
    expect(filterAndDedup(recipients, 'data_arrived')).toHaveLength(1);
    expect(filterAndDedup(recipients, 'data_arrived')[0].userId).toBe('u1');
  });

  it('skips userIds in alreadyNotifiedUserIds', () => {
    const recipients = [
      { userId: 'u1', email: 'a@x.com', pref: { email: false, in_app: true, events: ['data_arrived'] } },
      { userId: 'u2', email: 'b@x.com', pref: { email: false, in_app: true, events: ['data_arrived'] } },
    ];
    const out = filterAndDedup(recipients, 'data_arrived', ['u1']);
    expect(out.map(r => r.userId)).toEqual(['u2']);
  });

  it('dedupes the same userId when present from multiple subscriber rows', () => {
    const recipients = [
      { userId: 'u1', email: 'a@x.com', pref: { email: false, in_app: true, events: ['data_arrived'] } },
      { userId: 'u1', email: 'a@x.com', pref: { email: true, in_app: false, events: ['data_arrived'] } },
    ];
    const out = filterAndDedup(recipients, 'data_arrived');
    expect(out).toHaveLength(1);
  });

  it('treats a missing/non-array events field as no events (skip)', () => {
    const recipients = [
      { userId: 'u1', email: 'a@x.com', pref: { email: false, in_app: true } as never },
    ];
    expect(filterAndDedup(recipients as never, 'data_arrived')).toHaveLength(0);
  });
});

describe('formatSubscriberNotification', () => {
  it('formats data_arrived with Dutch locale rows', () => {
    const out = formatSubscriberNotification('data_arrived', { sourceLabel: 'Bevolking', rowsInserted: 1234 });
    expect(out.subject).toContain('Bevolking');
    expect(out.subject).toContain('Nieuwe data');
    expect(out.text).toContain('1.234');
    expect(out.type).toBe('success');
  });

  it('formats frequency_changed including old + new cron', () => {
    const out = formatSubscriberNotification('frequency_changed', { sourceLabel: 'Woningen', newCron: '0 6 * * *', previousCron: '0 6 * * 1' });
    expect(out.subject).toContain('Frequentie aangepast');
    expect(out.text).toContain('0 6 * * *');
    expect(out.text).toContain('0 6 * * 1');
    expect(out.type).toBe('info');
  });
});

describe('notifySubscribers — DB integration via mocks', () => {
  it('no-ops when no subscribers exist for the source', async () => {
    const result = await notifySubscribers({
      dataSourceKey: 'unsubscribed',
      event: 'data_arrived',
      payload: { sourceLabel: 'Unsubscribed', rowsInserted: 1 },
    });
    expect(result.dispatched).toBe(0);
    expect(createNotificationMock).not.toHaveBeenCalled();
    expect(emailSendMock).not.toHaveBeenCalled();
  });

  it('sends in-app to user-kind subscriber whose pref includes the event', async () => {
    dbState.subscribers = [
      { subscriber_kind: 'user', subscriber_id: '00000000-0000-0000-0000-000000000001', notification_pref: { email: false, in_app: true, events: ['data_arrived'] } },
    ];
    dbState.users = [{ id: '00000000-0000-0000-0000-000000000001', email: 'u@x.com' }];

    const result = await notifySubscribers({
      dataSourceKey: 'bevolking',
      event: 'data_arrived',
      payload: { sourceLabel: 'Bevolking', rowsInserted: 7 },
    });

    expect(result.dispatched).toBe(1);
    expect(createNotificationMock).toHaveBeenCalledTimes(1);
    expect(createNotificationMock.mock.calls[0][0]).toMatchObject({
      userId: '00000000-0000-0000-0000-000000000001',
      type: 'success',
    });
    expect(emailSendMock).not.toHaveBeenCalled();
  });

  it('honours email channel when pref.email is true and skips in-app when pref.in_app is false', async () => {
    dbState.subscribers = [
      { subscriber_kind: 'user', subscriber_id: '00000000-0000-0000-0000-000000000002', notification_pref: { email: true, in_app: false, events: ['frequency_changed'] } },
    ];
    dbState.users = [{ id: '00000000-0000-0000-0000-000000000002', email: 'recipient@x.com' }];

    await notifySubscribers({
      dataSourceKey: 'woningen',
      event: 'frequency_changed',
      payload: { sourceLabel: 'Woningen', newCron: '0 * * * *', previousCron: '0 6 * * *' },
    });

    expect(emailSendMock).toHaveBeenCalledTimes(1);
    expect(emailSendMock.mock.calls[0][0]).toMatchObject({ to: 'recipient@x.com' });
    expect(createNotificationMock).not.toHaveBeenCalled();
  });

  it('skips schedule owner when passed in alreadyNotifiedUserIds (dedup with sync-notifier)', async () => {
    dbState.subscribers = [
      { subscriber_kind: 'user', subscriber_id: '00000000-0000-0000-0000-000000000003', notification_pref: { email: false, in_app: true, events: ['data_arrived'] } },
      { subscriber_kind: 'user', subscriber_id: '00000000-0000-0000-0000-000000000004', notification_pref: { email: false, in_app: true, events: ['data_arrived'] } },
    ];
    dbState.users = [
      { id: '00000000-0000-0000-0000-000000000003', email: 'owner@x.com' },
      { id: '00000000-0000-0000-0000-000000000004', email: 'other@x.com' },
    ];

    const result = await notifySubscribers({
      dataSourceKey: 'huishoudens',
      event: 'data_arrived',
      payload: { sourceLabel: 'Huishoudens', rowsInserted: 100 },
      alreadyNotifiedUserIds: ['00000000-0000-0000-0000-000000000003'],
    });

    expect(result.dispatched).toBe(1);
    expect(createNotificationMock).toHaveBeenCalledTimes(1);
    expect(createNotificationMock.mock.calls[0][0]).toMatchObject({ userId: '00000000-0000-0000-0000-000000000004' });
  });

  it('resolves project_dashboard subscribers to project owners', async () => {
    dbState.subscribers = [
      { subscriber_kind: 'project_dashboard', subscriber_id: '11111111-1111-1111-1111-111111111111', notification_pref: { email: false, in_app: true, events: ['data_arrived'] } },
    ];
    dbState.dashboardOwners = [
      { dashboard_id: '11111111-1111-1111-1111-111111111111', owner_id: '00000000-0000-0000-0000-000000000005', owner_email: 'projowner@x.com' },
    ];

    const result = await notifySubscribers({
      dataSourceKey: 'bevolking',
      event: 'data_arrived',
      payload: { sourceLabel: 'Bevolking', rowsInserted: 5 },
    });

    expect(result.dispatched).toBe(1);
    expect(createNotificationMock.mock.calls[0][0]).toMatchObject({ userId: '00000000-0000-0000-0000-000000000005' });
  });

  it('silently drops project_dashboard subscribers whose project has no owner', async () => {
    dbState.subscribers = [
      { subscriber_kind: 'project_dashboard', subscriber_id: '22222222-2222-2222-2222-222222222222', notification_pref: { email: false, in_app: true, events: ['data_arrived'] } },
    ];
    dbState.dashboardOwners = [
      { dashboard_id: '22222222-2222-2222-2222-222222222222', owner_id: null, owner_email: null },
    ];

    const result = await notifySubscribers({
      dataSourceKey: 'bevolking',
      event: 'data_arrived',
      payload: { sourceLabel: 'Bevolking', rowsInserted: 5 },
    });

    expect(result.dispatched).toBe(0);
    expect(createNotificationMock).not.toHaveBeenCalled();
  });
});
