/**
 * Sync notifications — dispatch in-app + email when a sync_run finishes.
 *
 * Called by the sync scheduler after every scheduled run. Also callable from
 * the manual-trigger routes if the admin wants to be notified of manual runs.
 */

import { query } from '../../db/pool.js';
import { createNotification } from '../notification.service.js';
import { getEmailService } from '../email.service.js';
import type { SyncResult } from './cbs-generic-sync.js';

export type NotifyOn = 'always' | 'failure' | 'never';

export interface SyncNotifyOptions {
  /** User who owns the schedule (recipient). If null, falls back to all admins. */
  recipientUserId?: string | null;
  notifyEmail: boolean;
  notifyInApp: boolean;
  notifyOn: NotifyOn;
  /** Label for the data source in the notification subject/title. */
  sourceLabel?: string;
  /** Trigger that caused this sync (e.g. 'scheduled', 'manual'). */
  trigger: string;
}

function shouldNotify(opts: SyncNotifyOptions, result: SyncResult): boolean {
  if (opts.notifyOn === 'never') return false;
  if (opts.notifyOn === 'always') return true;
  // 'failure' — notify when errors present or zero rows inserted.
  return result.errors.length > 0 || result.rowsInserted === 0;
}

async function resolveRecipients(recipientUserId?: string | null): Promise<Array<{ id: string; email: string }>> {
  if (recipientUserId) {
    const r = await query('SELECT id, email FROM users WHERE id = $1', [recipientUserId]);
    return r.rows as Array<{ id: string; email: string }>;
  }
  // Fallback: all admins.
  const r = await query("SELECT id, email FROM users WHERE role = 'admin'");
  return r.rows as Array<{ id: string; email: string }>;
}

function formatSummary(result: SyncResult, trigger: string, label: string): {
  subject: string;
  text: string;
  html: string;
  type: 'success' | 'warning' | 'error';
} {
  const ok = result.errors.length === 0 && result.rowsInserted > 0;
  const partial = result.rowsInserted > 0 && result.errors.length > 0;
  const type: 'success' | 'warning' | 'error' = ok ? 'success' : partial ? 'warning' : 'error';
  const statusLabel = ok ? 'geslaagd' : partial ? 'gedeeltelijk' : 'mislukt';
  const subject = `[Dashboarding] CBS sync ${statusLabel}: ${label}`;
  const durationS = (result.duration / 1000).toFixed(1);
  const lines = [
    `Trigger: ${trigger}`,
    `CBS tabel: ${result.cbsTable}`,
    `Rijen opgehaald: ${result.rowsFetched.toLocaleString('nl-NL')}`,
    `Rijen verwerkt: ${result.rowsInserted.toLocaleString('nl-NL')}`,
    `Duur: ${durationS}s`,
  ];
  if (result.errors.length) {
    lines.push('', 'Fouten:');
    for (const err of result.errors.slice(0, 5)) lines.push(`  - ${err}`);
  }
  const text = lines.join('\n');
  const html = `<pre style="font-family:ui-monospace,Menlo,monospace">${lines.join('<br>')}</pre>`;
  return { subject, text, html, type };
}

export async function notifySyncFinished(result: SyncResult, opts: SyncNotifyOptions): Promise<void> {
  if (!shouldNotify(opts, result)) return;

  const label = opts.sourceLabel ?? result.source;
  const { subject, text, html, type } = formatSummary(result, opts.trigger, label);
  const recipients = await resolveRecipients(opts.recipientUserId);
  if (recipients.length === 0) return;

  const link = `/admin/cbs-sync?source=${encodeURIComponent(result.source)}`;

  await Promise.all(recipients.map(async (user) => {
    const tasks: Promise<unknown>[] = [];
    if (opts.notifyInApp) {
      tasks.push(
        createNotification({
          userId: user.id,
          title: subject.replace(/^\[Dashboarding\]\s*/, ''),
          message: text,
          type,
          link,
        }).catch(err => console.error(`[SyncNotify] in-app failed for ${user.id}:`, err)),
      );
    }
    if (opts.notifyEmail && user.email) {
      const email = getEmailService();
      tasks.push(
        email.send({ to: user.email, subject, text, html })
          .catch(err => console.error(`[SyncNotify] email failed for ${user.email}:`, err)),
      );
    }
    await Promise.all(tasks);
  }));
}
