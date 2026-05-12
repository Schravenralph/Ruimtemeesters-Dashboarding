/**
 * Subscriber notifications (ADR-006).
 *
 * Companion to `cbs/sync-notifier.ts` (which notifies schedule owners).
 * This module notifies `sync_subscribers` — users who opted in via the
 * in-dashboard "Updatefrequentie" picker — when something happens to a
 * data source they subscribed to.
 *
 * Two events:
 *   - 'data_arrived'      — a sync_run completed with new rows
 *   - 'frequency_changed' — the aggregator wrote a new cron to sync_schedules
 *
 * Each subscriber has a `notification_pref` JSONB:
 *   { email: boolean, in_app: boolean, events: string[] }
 *
 * Subscribers whose `events` array does not contain the firing event are
 * skipped. Subscribers in `alreadyNotifiedUserIds` are skipped (dedup with
 * the schedule-owner path).
 */
import { query } from '../../db/pool.js';
import { createNotification } from '../notification.service.js';
import { getEmailService } from '../email.service.js';

export type SubscriberEvent = 'data_arrived' | 'frequency_changed';

interface NotificationPref {
  email: boolean;
  in_app: boolean;
  events: string[];
}

interface SubscriberRow {
  subscriber_kind: 'user' | 'project_dashboard';
  subscriber_id: string;
  notification_pref: NotificationPref;
}

interface Recipient {
  userId: string;
  email: string | null;
  /** The original subscriber row's pref — controls channels for this user. */
  pref: NotificationPref;
}

export interface DataArrivedPayload {
  sourceLabel: string;
  rowsInserted: number;
  syncRunId?: string | null;
}

export interface FrequencyChangedPayload {
  sourceLabel: string;
  newCron: string;
  previousCron: string;
}

export interface NotifySubscribersArgs {
  dataSourceKey: string;
  event: SubscriberEvent;
  payload: DataArrivedPayload | FrequencyChangedPayload;
  /** User IDs already notified by another path (e.g. schedule owner). Skipped. */
  alreadyNotifiedUserIds?: string[];
}

/**
 * Format the notification subject + body for a given event/payload.
 * Pure — exported so tests can assert formatting without DB.
 */
export function formatSubscriberNotification(event: SubscriberEvent, payload: DataArrivedPayload | FrequencyChangedPayload): {
  subject: string;
  text: string;
  html: string;
  type: 'info' | 'success';
} {
  if (event === 'data_arrived') {
    const p = payload as DataArrivedPayload;
    const subject = `[Dashboarding] Nieuwe data: ${p.sourceLabel}`;
    const rowsNl = p.rowsInserted.toLocaleString('nl-NL');
    const text = `Er is nieuwe data binnengekomen voor ${p.sourceLabel}: ${rowsNl} rijen verwerkt.`;
    const html = `<p>Er is nieuwe data binnengekomen voor <strong>${p.sourceLabel}</strong>: ${rowsNl} rijen verwerkt.</p>`;
    return { subject, text, html, type: 'success' };
  }
  const p = payload as FrequencyChangedPayload;
  const subject = `[Dashboarding] Frequentie aangepast: ${p.sourceLabel}`;
  const text = `De update-frequentie voor ${p.sourceLabel} is aangepast van "${p.previousCron}" naar "${p.newCron}".`;
  const html = `<p>De update-frequentie voor <strong>${p.sourceLabel}</strong> is aangepast van <code>${p.previousCron}</code> naar <code>${p.newCron}</code>.</p>`;
  return { subject, text, html, type: 'info' };
}

async function loadSubscribers(dataSourceKey: string): Promise<SubscriberRow[]> {
  const r = await query<SubscriberRow>(
    `SELECT subscriber_kind, subscriber_id, notification_pref
       FROM sync_subscribers
      WHERE data_source_key = $1`,
    [dataSourceKey],
  );
  return r.rows;
}

/**
 * Resolve a list of subscriber rows to a deduplicated list of recipients
 * (userId + email + pref). For 'user' kind: direct lookup. For
 * 'project_dashboard' kind: resolve via `project_dashboards.project_id ->
 * projects.created_by`. If created_by is NULL the row is silently dropped
 * (project sharing isn't a thing yet; the project owner is the only target).
 */
async function resolveRecipients(rows: SubscriberRow[]): Promise<Recipient[]> {
  if (rows.length === 0) return [];

  const userIds = rows.filter(r => r.subscriber_kind === 'user').map(r => r.subscriber_id);
  const dashIds = rows.filter(r => r.subscriber_kind === 'project_dashboard').map(r => r.subscriber_id);

  const userPrefById = new Map<string, NotificationPref>();
  for (const r of rows.filter(x => x.subscriber_kind === 'user')) userPrefById.set(r.subscriber_id, r.notification_pref);

  const dashPrefById = new Map<string, NotificationPref>();
  for (const r of rows.filter(x => x.subscriber_kind === 'project_dashboard')) dashPrefById.set(r.subscriber_id, r.notification_pref);

  const recipients: Recipient[] = [];

  if (userIds.length) {
    const r = await query<{ id: string; email: string | null }>(
      `SELECT id, email FROM users WHERE id = ANY($1::uuid[])`,
      [userIds],
    );
    for (const row of r.rows) {
      const pref = userPrefById.get(row.id);
      if (pref) recipients.push({ userId: row.id, email: row.email, pref });
    }
  }

  if (dashIds.length) {
    const r = await query<{ dashboard_id: string; owner_id: string | null; owner_email: string | null }>(
      `SELECT pd.id AS dashboard_id, p.created_by AS owner_id, u.email AS owner_email
         FROM project_dashboards pd
         JOIN projects p ON p.id = pd.project_id
         LEFT JOIN users u ON u.id = p.created_by
        WHERE pd.id = ANY($1::uuid[])`,
      [dashIds],
    );
    for (const row of r.rows) {
      if (!row.owner_id) continue;
      const pref = dashPrefById.get(row.dashboard_id);
      if (pref) recipients.push({ userId: row.owner_id, email: row.owner_email, pref });
    }
  }

  return recipients;
}

/**
 * Filter recipients to those (a) whose pref.events includes the firing event
 * and (b) not in alreadyNotifiedUserIds. Deduplicates by userId — if a user
 * subscribed both directly and via a project_dashboard, prefer the direct
 * pref (first seen wins after a stable sort by kind).
 */
export function filterAndDedup(
  recipients: Recipient[],
  event: SubscriberEvent,
  alreadyNotifiedUserIds: string[] = [],
): Recipient[] {
  const skip = new Set(alreadyNotifiedUserIds);
  const seen = new Set<string>();
  const out: Recipient[] = [];
  for (const r of recipients) {
    if (skip.has(r.userId)) continue;
    if (!Array.isArray(r.pref.events) || !r.pref.events.includes(event)) continue;
    if (seen.has(r.userId)) continue;
    seen.add(r.userId);
    out.push(r);
  }
  return out;
}

export async function notifySubscribers(args: NotifySubscribersArgs): Promise<{ dispatched: number }> {
  const subscribers = await loadSubscribers(args.dataSourceKey);
  if (subscribers.length === 0) return { dispatched: 0 };

  const recipients = await resolveRecipients(subscribers);
  const targets = filterAndDedup(recipients, args.event, args.alreadyNotifiedUserIds);
  if (targets.length === 0) return { dispatched: 0 };

  const { subject, text, html, type } = formatSubscriberNotification(args.event, args.payload);
  const link = `/dashboard?source=${encodeURIComponent(args.dataSourceKey)}`;
  const title = subject.replace(/^\[Dashboarding\]\s*/, '');

  await Promise.all(targets.map(async (r) => {
    const tasks: Promise<unknown>[] = [];
    if (r.pref.in_app) {
      tasks.push(
        createNotification({ userId: r.userId, title, message: text, type, link })
          .catch(err => console.error(`[SubscriberNotify] in-app failed for ${r.userId}:`, err)),
      );
    }
    if (r.pref.email && r.email) {
      const email = getEmailService();
      tasks.push(
        email.send({ to: r.email, subject, text, html })
          .catch(err => console.error(`[SubscriberNotify] email failed for ${r.email}:`, err)),
      );
    }
    await Promise.all(tasks);
  }));

  return { dispatched: targets.length };
}
