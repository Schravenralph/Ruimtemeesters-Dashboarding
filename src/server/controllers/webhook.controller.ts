import type { Request, Response } from 'express';
import { query } from '../db/pool.js';
import { z } from 'zod';
import crypto from 'crypto';

const CreateWebhookSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  secret: z.string().optional(),
});

export async function listWebhooks(req: Request, res: Response): Promise<void> {
  if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

  const result = await query(
    'SELECT * FROM webhooks WHERE user_id = $1 ORDER BY created_at DESC',
    [req.user.id],
  );

  res.json({
    webhooks: result.rows.map(r => ({
      id: r.id,
      name: r.name,
      url: r.url,
      events: r.events,
      isActive: r.is_active,
      lastTriggeredAt: r.last_triggered_at,
      failureCount: r.failure_count,
      createdAt: r.created_at,
    })),
  });
}

export async function createWebhook(req: Request, res: Response): Promise<void> {
  if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

  const parsed = CreateWebhookSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  const { name, url, events, secret } = parsed.data;

  const result = await query(
    `INSERT INTO webhooks (user_id, name, url, events, secret)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, created_at`,
    [req.user.id, name, url, events, secret || null],
  );

  res.status(201).json({
    id: result.rows[0].id,
    name,
    url,
    events,
    createdAt: result.rows[0].created_at,
  });
}

export async function deleteWebhook(req: Request, res: Response): Promise<void> {
  if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

  const result = await query(
    'DELETE FROM webhooks WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user.id],
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Webhook not found' });
    return;
  }

  res.status(204).send();
}

/**
 * Trigger webhooks for a specific event.
 * Called internally when events occur (data import, dashboard create, etc.)
 */
export async function triggerWebhooks(event: string, payload: Record<string, unknown>): Promise<void> {
  const result = await query(
    `SELECT * FROM webhooks WHERE is_active = true AND $1 = ANY(events)`,
    [event],
  );

  for (const webhook of result.rows) {
    try {
      const signature = webhook.secret
        ? crypto.createHmac('sha256', webhook.secret).update(JSON.stringify(payload)).digest('hex')
        : undefined;

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(signature ? { 'X-Webhook-Signature': signature } : {}),
        },
        body: JSON.stringify({ event, payload, timestamp: new Date().toISOString() }),
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        await query(
          `UPDATE webhooks SET last_triggered_at = NOW(), failure_count = 0 WHERE id = $1`,
          [webhook.id],
        );
      } else {
        await query(
          `UPDATE webhooks SET failure_count = failure_count + 1 WHERE id = $1`,
          [webhook.id],
        );
        if (webhook.failure_count >= 9) {
          await query(
            `UPDATE webhooks SET is_active = false WHERE id = $1`,
            [webhook.id],
          );
        }
      }
    } catch {
      await query(
        `UPDATE webhooks SET failure_count = failure_count + 1 WHERE id = $1`,
        [webhook.id],
      );
      if (webhook.failure_count >= 9) {
        await query(
          `UPDATE webhooks SET is_active = false WHERE id = $1`,
          [webhook.id],
        );
      }
    }
  }
}
