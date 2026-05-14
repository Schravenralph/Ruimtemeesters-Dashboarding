import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response } from 'express';

const mocks = vi.hoisted(() => {
  const calls: Array<{ sql: string; params?: unknown[] }> = [];
  const queryMock = vi.fn(async (sql: string, params?: unknown[]) => {
    calls.push({ sql, params });
    if (/FROM user_templates WHERE id =/.test(sql)) {
      const id = params?.[0] as string;
      if (id === 'private-tpl') {
        return {
          rows: [{
            id, user_id: 'u1', organization_id: 'org1', name: 'Private one',
            description: null, source_theme_slug: 'wonen', tiles: [], layout: [],
            visibility: 'private',
          }],
          rowCount: 1,
        };
      }
      if (id === 'org-tpl') {
        return {
          rows: [{
            id, user_id: 'u1', organization_id: 'org1', name: 'Wonen plus',
            description: 'with cohort', source_theme_slug: 'wonen', tiles: [{ id: 't1' }],
            layout: [{ i: 't1', x: 0, y: 0, w: 6, h: 4 }], visibility: 'org',
          }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    }
    if (/INSERT INTO dashboard_templates/.test(sql)) {
      return {
        rows: [{
          id: 'sys-tpl-1', name: params?.[0], description: params?.[1],
          category: 'community', tiles: [], layout: [],
          theme_slug: params?.[4], version: 1,
          source_user_template_id: params?.[5], promoted_by_user_id: params?.[6],
          promoted_at: '2026-05-14T07:00:00Z', created_at: '2026-05-14T07:00:00Z',
        }],
        rowCount: 1,
      };
    }
    if (/INSERT INTO audit_log/.test(sql)) {
      return { rows: [], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  });
  return { queryMock, calls };
});

vi.mock('../db/pool.js', () => ({
  query: mocks.queryMock,
  pool: {} as unknown,
  getClient: vi.fn(),
}));

import { promoteTemplate } from './admin-template.controller';

function makeRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { res: { json, status } as unknown as Response, status, json };
}

const adminUser = { id: 'admin-uuid', email: 'admin@rm.nl', name: 'Admin', role: 'admin', organizationId: 'org1', attributes: {} };
const viewerUser = { ...adminUser, role: 'viewer' };

beforeEach(() => {
  mocks.calls.length = 0;
  mocks.queryMock.mockClear();
});

afterEach(() => vi.clearAllMocks());

describe('promoteTemplate', () => {
  it('promotes an org-visible template, inserts row, and writes audit', async () => {
    const req = { user: adminUser, body: { userTemplateId: 'org-tpl' }, ip: '127.0.0.1' } as unknown as Request;
    const { res, status, json } = makeRes();
    await promoteTemplate(req, res);
    expect(status).not.toHaveBeenCalledWith(403);
    expect(status).not.toHaveBeenCalledWith(400);
    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      id: 'sys-tpl-1',
      category: 'community',
      sourceUserTemplateId: 'org-tpl',
      promotedByUserId: 'admin-uuid',
    }));
    const auditCall = mocks.calls.find(c => /INSERT INTO audit_log/.test(c.sql));
    expect(auditCall).toBeDefined();
    expect(auditCall!.params![1]).toBe('template.promote');
    expect(auditCall!.params![2]).toBe('dashboard_template');
    const details = JSON.parse(auditCall!.params![4] as string);
    expect(details.sourceUserTemplateId).toBe('org-tpl');
    expect(details.sourceUserId).toBe('u1');
    expect(details.sourceVisibility).toBe('org');
  });

  it('rejects non-admin callers with 403', async () => {
    const req = { user: viewerUser, body: { userTemplateId: 'org-tpl' } } as unknown as Request;
    const { res, status, json } = makeRes();
    await promoteTemplate(req, res);
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: 'Platform admin role required' });
    const insertCall = mocks.calls.find(c => /INSERT INTO dashboard_templates/.test(c.sql));
    expect(insertCall).toBeUndefined();
  });

  it('rejects promoting a private template with 400', async () => {
    const req = { user: adminUser, body: { userTemplateId: 'private-tpl' } } as unknown as Request;
    const { res, status, json } = makeRes();
    await promoteTemplate(req, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: 'Template must be org- or public-visible to promote' });
  });

  it('returns 404 when the source template does not exist', async () => {
    const req = { user: adminUser, body: { userTemplateId: 'does-not-exist' } } as unknown as Request;
    const { res, status, json } = makeRes();
    await promoteTemplate(req, res);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ error: 'User template not found' });
  });

  it('returns 400 when userTemplateId is missing', async () => {
    const req = { user: adminUser, body: {} } as unknown as Request;
    const { res, status, json } = makeRes();
    await promoteTemplate(req, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: 'userTemplateId is required' });
  });

  it('honors a name override passed in the body', async () => {
    const req = { user: adminUser, body: { userTemplateId: 'org-tpl', name: 'Curated Wonen' } } as unknown as Request;
    const { res, status } = makeRes();
    await promoteTemplate(req, res);
    expect(status).toHaveBeenCalledWith(201);
    const insertCall = mocks.calls.find(c => /INSERT INTO dashboard_templates/.test(c.sql));
    expect(insertCall!.params![0]).toBe('Curated Wonen');
  });
});
