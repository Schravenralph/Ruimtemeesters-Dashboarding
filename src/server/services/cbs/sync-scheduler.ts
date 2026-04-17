/**
 * CBS sync scheduler — reads sync_schedules and registers node-cron jobs.
 *
 * Lifecycle:
 *   - start()   called once on server boot; loads schedules, starts jobs.
 *   - reload()  called after admins create/update/delete schedules.
 *   - stop()    called on shutdown.
 */

import cron, { type ScheduledTask } from 'node-cron';
import { query } from '../../db/pool.js';
import { syncGeneric, type GenericSyncConfig } from './cbs-generic-sync.js';
import { notifySyncFinished, type NotifyOn } from './sync-notifier.js';

interface ScheduleRow {
  id: string;
  data_source_key: string;
  cron_expression: string;
  timezone: string;
  year_filter: number | null;
  is_enabled: boolean;
  notify_email: boolean;
  notify_in_app: boolean;
  notify_on: NotifyOn;
  created_by: string | null;
  source_name: string;
  sync_config: GenericSyncConfig | null;
}

const jobs = new Map<string, ScheduledTask>();
let started = false;

async function loadSchedules(): Promise<ScheduleRow[]> {
  const r = await query(`
    SELECT s.id, s.data_source_key, s.cron_expression, s.timezone, s.year_filter,
           s.is_enabled, s.notify_email, s.notify_in_app, s.notify_on, s.created_by,
           ds.name AS source_name, ds.sync_config
    FROM sync_schedules s
    JOIN data_sources ds ON ds.key = s.data_source_key
    WHERE s.is_enabled = true
  `);
  return r.rows as ScheduleRow[];
}

async function runScheduled(schedule: ScheduleRow): Promise<void> {
  if (!schedule.sync_config) {
    console.warn(`[SyncScheduler] ${schedule.data_source_key}: no sync_config on data_sources row, skipping`);
    return;
  }
  console.log(`[SyncScheduler] Running ${schedule.data_source_key} (cron=${schedule.cron_expression})`);

  const result = await syncGeneric(schedule.data_source_key, schedule.sync_config, {
    yearFilter: schedule.year_filter ?? undefined,
    trigger: 'scheduled',
    triggeredBy: schedule.created_by,
  });

  try {
    await query(
      `UPDATE sync_schedules
         SET last_run_at = NOW(), last_run_status = $2, last_run_id = $3, updated_at = NOW()
       WHERE id = $1`,
      [
        schedule.id,
        result.errors.length === 0 && result.rowsInserted > 0 ? 'success'
          : result.rowsInserted > 0 ? 'partial' : 'failed',
        result.syncRunId ?? null,
      ],
    );
  } catch (err) {
    console.error(`[SyncScheduler] failed to update last_run for schedule ${schedule.id}:`, err);
  }

  await notifySyncFinished(result, {
    recipientUserId: schedule.created_by,
    notifyEmail: schedule.notify_email,
    notifyInApp: schedule.notify_in_app,
    notifyOn: schedule.notify_on,
    sourceLabel: schedule.source_name,
    trigger: 'scheduled',
  });
}

function scheduleJob(schedule: ScheduleRow): void {
  if (!cron.validate(schedule.cron_expression)) {
    console.error(`[SyncScheduler] invalid cron for ${schedule.data_source_key}: "${schedule.cron_expression}"`);
    return;
  }
  const task = cron.schedule(
    schedule.cron_expression,
    () => {
      runScheduled(schedule).catch(err =>
        console.error(`[SyncScheduler] ${schedule.data_source_key} crashed:`, err),
      );
    },
    { timezone: schedule.timezone || 'Europe/Amsterdam' },
  );
  jobs.set(schedule.id, task);
  console.log(`[SyncScheduler] Registered ${schedule.data_source_key} @ "${schedule.cron_expression}" (${schedule.timezone})`);
}

function clearAll(): void {
  for (const [, task] of jobs) {
    try { task.stop(); } catch { /* ignore */ }
  }
  jobs.clear();
}

export async function startSyncScheduler(): Promise<void> {
  if (started) return;
  const next = reloadQueue.catch(() => 0).then(async () => {
    if (started) return 0;
    try {
      const schedules = await loadSchedules();
      for (const s of schedules) scheduleJob(s);
      started = true;
      console.log(`[SyncScheduler] Started with ${schedules.length} schedules`);
      return schedules.length;
    } catch (err) {
      console.error('[SyncScheduler] Failed to start (will retry on next call):', err);
      return 0;
    }
  });
  reloadQueue = next;
  await next;
}

// Serialise reloads via a chain. Every caller gets their own reload that runs
// *after* any in-flight or queued reload, so each CRUD write is guaranteed to
// be visible in the DB read that loads the scheduler's next state. Sharing a
// single in-flight promise would let the second caller return stale state
// from before their own DB write.
let reloadQueue: Promise<number> = Promise.resolve(0);

export function reloadSyncScheduler(): Promise<number> {
  const next = reloadQueue.catch(() => 0).then(async () => {
    // Load first. If this throws, existing jobs keep running — better than
    // leaving the scheduler empty until the next CRUD call.
    const schedules = await loadSchedules();
    clearAll();
    for (const s of schedules) scheduleJob(s);
    console.log(`[SyncScheduler] Reloaded (${schedules.length} schedules)`);
    return schedules.length;
  });
  reloadQueue = next;
  return next;
}

export function stopSyncScheduler(): void {
  clearAll();
  started = false;
}

/** Exposed for tests + manual admin trigger. */
export async function runScheduleNow(scheduleId: string): Promise<void> {
  const r = await query(`
    SELECT s.id, s.data_source_key, s.cron_expression, s.timezone, s.year_filter,
           s.is_enabled, s.notify_email, s.notify_in_app, s.notify_on, s.created_by,
           ds.name AS source_name, ds.sync_config
    FROM sync_schedules s
    JOIN data_sources ds ON ds.key = s.data_source_key
    WHERE s.id = $1
  `, [scheduleId]);
  if (r.rows.length === 0) throw new Error(`Schedule ${scheduleId} not found`);
  await runScheduled(r.rows[0] as ScheduleRow);
}
