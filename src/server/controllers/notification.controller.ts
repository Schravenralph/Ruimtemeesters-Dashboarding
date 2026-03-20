import type { Request, Response } from 'express';
import { query } from '../db/pool.js';

export async function listNotifications(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const result = await query(
    `SELECT * FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [req.user.id],
  );

  res.json({
    notifications: result.rows.map(r => ({
      id: r.id,
      title: r.title,
      message: r.message,
      type: r.type,
      isRead: r.is_read,
      link: r.link,
      createdAt: r.created_at,
    })),
    unreadCount: result.rows.filter(r => !r.is_read).length,
  });
}

export async function markAsRead(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const { id } = req.params;

  if (id === 'all') {
    await query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1',
      [req.user.id],
    );
  } else {
    await query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [id, req.user.id],
    );
  }

  res.json({ success: true });
}

export async function createNotification(
  userId: string,
  title: string,
  options: { message?: string; type?: string; link?: string } = {},
): Promise<void> {
  await query(
    `INSERT INTO notifications (user_id, title, message, type, link)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, title, options.message || null, options.type || 'info', options.link || null],
  );
}
