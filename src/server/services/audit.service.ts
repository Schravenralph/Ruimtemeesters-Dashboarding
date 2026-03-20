import { query } from '../db/pool.js';

export interface AuditEntry {
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_log (user_id, action, resource_type, resource_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        entry.userId,
        entry.action,
        entry.resourceType,
        entry.resourceId || null,
        JSON.stringify(entry.details || {}),
        entry.ipAddress || null,
      ],
    );
  } catch (err) {
    // Don't let audit failures break the request
    console.error('Audit log failed:', err);
  }
}

export async function getAuditLog(options: {
  userId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (options.userId) {
    conditions.push(`a.user_id = $${idx++}`);
    params.push(options.userId);
  }
  if (options.action) {
    conditions.push(`a.action = $${idx++}`);
    params.push(options.action);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(options.limit || 50, 200);
  const offset = options.offset || 0;

  const result = await query(
    `SELECT a.*, u.name as user_name, u.email as user_email
     FROM audit_log a
     LEFT JOIN users u ON u.id = a.user_id
     ${where}
     ORDER BY a.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  return result.rows;
}
