import { query } from '../db/pool.js';

/**
 * Notification service for creating and managing in-app notifications.
 */

export interface CreateNotificationOptions {
  userId: string;
  title: string;
  message?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  link?: string;
}

export async function createNotification(options: CreateNotificationOptions): Promise<string> {
  const { userId, title, message, type = 'info', link } = options;

  const result = await query(
    `INSERT INTO notifications (user_id, title, message, type, link)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [userId, title, message || null, type, link || null],
  );

  return result.rows[0].id;
}

/**
 * Send notification to all users with a specific role.
 */
export async function notifyRole(
  role: string,
  title: string,
  message?: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
): Promise<number> {
  const users = await query('SELECT id FROM users WHERE role = $1', [role]);
  let count = 0;

  for (const user of users.rows) {
    await createNotification({ userId: user.id, title, message, type });
    count++;
  }

  return count;
}

/**
 * Send notification to all admin users.
 */
export async function notifyAdmins(
  title: string,
  message?: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
): Promise<number> {
  return notifyRole('admin', title, message, type);
}

/**
 * Get unread notification count for a user.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const result = await query(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND NOT is_read',
    [userId],
  );
  return parseInt(result.rows[0].count, 10);
}

/**
 * Delete old notifications (cleanup job).
 */
export async function cleanupOldNotifications(daysToKeep: number = 90): Promise<number> {
  const result = await query(
    `DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '${daysToKeep} days' RETURNING id`,
  );
  return result.rowCount || 0;
}
