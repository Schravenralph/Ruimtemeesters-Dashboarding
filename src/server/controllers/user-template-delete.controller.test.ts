import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response } from 'express';

const mocks = vi.hoisted(() => {
  const calls: Array<{ sql: string; params?: unknown[] }> = [];
  const queryMock = vi.fn(async (sql: string, params?: unknown[]) => {
    calls.push({ sql, params });
    if (/FROM user_templates WHERE id =/.test(sql)) {
      const id = params?.[0] as string;
      const fixtures: Record<string, { user_id: string; organization_id: string; visibility: 'private' | 'org' | 'public' }> = {
        'priv-mine':    { user_id: 'u1', organization_id: 'org1', visibility: 'private' },
        'priv-other':   { user_id: 'u2', organization_id: 'org1', visibility: 'private' },
        'org-mine':     { user_id: 'u1', organization_id: 'org1', visibility: 'org' },
        'org-other':    { user_id: 'u2', organization_id: 'org1', visibility: 'org' },
        'org-otherorg': { user_id: 'u2', organization_id: 'org2', visibility: 'org' },
        'pub-other':    { user_id: 'u2', organization_id: 'org1', visibility: 'public' },
      };
      const f = fixtures[id];
      if (!f) return { rows: [], rowCount: 0 };
      return { rows: [{ id, ...f }], rowCount: 1 };
    }
    if (/^DELETE FROM user_templates/.test(sql.trim())) {
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

import { deleteUserTemplate } from './user-template.controller';

function makeRes() {
  const json = vi.fn();
  const end = vi.fn();
  const status = vi.fn().mockReturnValue({ json, end });
  return { res: { json, end, status } as unknown as Response, status, json, end };
}

const owner = { id: 'u1', email: 'u1@rm.nl', name: 'U1', role: 'viewer', organizationId: 'org1', attributes: {} };
const orgAdmin = { id: 'u9', email: 'a@rm.nl', name: 'Admin', role: 'admin', organizationId: 'org1', attributes: {} };
const otherUser = { ...owner, id: 'u3' };

beforeEach(() => {
  mocks.calls.length = 0;
  mocks.queryMock.mockClear();
});

afterEach(() => vi.clearAllMocks());

describe('deleteUserTemplate', () => {
  it('owner can delete their private template', async () => {
    const req = { user: owner, params: { id: 'priv-mine' } } as unknown as Request;
    const { res, status, end } = makeRes();
    await deleteUserTemplate(req, res);
    expect(status).toHaveBeenCalledWith(204);
    expect(end).toHaveBeenCalled();
    expect(mocks.calls.some(c => /^DELETE FROM user_templates/.test(c.sql.trim()))).toBe(true);
  });

  it('org admin can delete an org-visible template within their org', async () => {
    const req = { user: orgAdmin, params: { id: 'org-other' } } as unknown as Request;
    const { res, status } = makeRes();
    await deleteUserTemplate(req, res);
    expect(status).toHaveBeenCalledWith(204);
  });

  it('non-owner viewer is 403 on an org-visible template', async () => {
    const req = { user: otherUser, params: { id: 'org-other' } } as unknown as Request;
    const { res, status, json } = makeRes();
    await deleteUserTemplate(req, res);
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: 'Not authorised to delete this template' });
    expect(mocks.calls.some(c => /^DELETE FROM user_templates/.test(c.sql.trim()))).toBe(false);
  });

  it('org admin cannot delete a public template they do not own', async () => {
    const req = { user: orgAdmin, params: { id: 'pub-other' } } as unknown as Request;
    const { res, status, json } = makeRes();
    await deleteUserTemplate(req, res);
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: 'Not authorised to delete this template' });
  });

  it('returns 404 when the template id does not exist', async () => {
    const req = { user: owner, params: { id: 'does-not-exist' } } as unknown as Request;
    const { res, status, json } = makeRes();
    await deleteUserTemplate(req, res);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ error: 'Template not found' });
  });

  it('org admin cannot delete an org-visible template owned by another org', async () => {
    const req = { user: orgAdmin, params: { id: 'org-otherorg' } } as unknown as Request;
    const { res, status } = makeRes();
    await deleteUserTemplate(req, res);
    expect(status).toHaveBeenCalledWith(403);
  });
});
