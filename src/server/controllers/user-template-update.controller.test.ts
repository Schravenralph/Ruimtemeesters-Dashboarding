import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response } from 'express';

const mocks = vi.hoisted(() => {
  const calls: Array<{ sql: string; params?: unknown[] }> = [];
  const queryMock = vi.fn(async (sql: string, params?: unknown[]) => {
    calls.push({ sql, params });
    if (/SELECT id, user_id, organization_id FROM user_templates/.test(sql)) {
      return state.existing
        ? { rows: [state.existing], rowCount: 1 }
        : { rows: [], rowCount: 0 };
    }
    if (/UPDATE user_templates/.test(sql)) {
      return { rows: [state.updated ?? state.existing], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  });
  const state: { existing: Record<string, unknown> | null; updated: Record<string, unknown> | null } = { existing: null, updated: null };
  return { queryMock, calls, state };
});

vi.mock('../db/pool.js', () => ({ query: mocks.queryMock, pool: {} as unknown, getClient: vi.fn() }));

import { updateUserTemplate } from './user-template.controller';

function makeRes(): { res: Response; status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> } {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { res: { json, status } as unknown as Response, status, json };
}

const owner = { id: 'owner', email: 'o@x.com', name: 'O', role: 'editor', organizationId: 'org-1', attributes: {} };
const orgAdmin = { id: 'admin', email: 'a@x.com', name: 'A', role: 'admin', organizationId: 'org-1', attributes: {} };
const otherEditor = { id: 'other', email: 'b@x.com', name: 'B', role: 'editor', organizationId: 'org-1', attributes: {} };
const adminElsewhere = { id: 'admin2', email: 'a2@x.com', name: 'A2', role: 'admin', organizationId: 'org-2', attributes: {} };

const existingRow = {
  id: 'tpl-1', user_id: 'owner', organization_id: 'org-1',
  name: 'Old', description: null, source_theme_slug: null,
  tiles: [], layout: [], visibility: 'private', version: 1,
  created_at: 't', updated_at: 't',
};

beforeEach(() => {
  mocks.calls.length = 0;
  mocks.state.existing = { ...existingRow };
  mocks.state.updated = { ...existingRow, visibility: 'org', updated_at: 't+' };
  mocks.queryMock.mockClear();
});
afterEach(() => vi.clearAllMocks());

describe('updateUserTemplate', () => {
  it('401s without auth', async () => {
    const { res, status, json } = makeRes();
    await updateUserTemplate({ params: { id: 'tpl-1' }, body: { visibility: 'org' } } as unknown as Request, res);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'Authentication required' });
  });

  it('400s on empty body (no fields to update)', async () => {
    const { res, status } = makeRes();
    await updateUserTemplate({ user: owner, params: { id: 'tpl-1' }, body: {} } as unknown as Request, res);
    expect(status).toHaveBeenCalledWith(400);
  });

  it('404s when template does not exist', async () => {
    mocks.state.existing = null;
    const { res, status } = makeRes();
    await updateUserTemplate({ user: owner, params: { id: 'missing' }, body: { visibility: 'org' } } as unknown as Request, res);
    expect(status).toHaveBeenCalledWith(404);
  });

  it('owner can change visibility', async () => {
    const { res, status, json } = makeRes();
    await updateUserTemplate({ user: owner, params: { id: 'tpl-1' }, body: { visibility: 'org' } } as unknown as Request, res);
    expect(status).not.toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ visibility: 'org' }));
    const update = mocks.calls.find(c => /UPDATE user_templates/.test(c.sql));
    expect(update).toBeTruthy();
  });

  it('org admin can change visibility on same-org template', async () => {
    const { res, json, status } = makeRes();
    await updateUserTemplate({ user: orgAdmin, params: { id: 'tpl-1' }, body: { visibility: 'public' } } as unknown as Request, res);
    expect(status).not.toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalled();
  });

  it('non-owner non-admin is 403', async () => {
    const { res, status, json } = makeRes();
    await updateUserTemplate({ user: otherEditor, params: { id: 'tpl-1' }, body: { visibility: 'org' } } as unknown as Request, res);
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: 'Not authorised to edit this template' });
  });

  it('admin in another org is 403 (no cross-org promotion)', async () => {
    const { res, status } = makeRes();
    await updateUserTemplate({ user: adminElsewhere, params: { id: 'tpl-1' }, body: { visibility: 'public' } } as unknown as Request, res);
    expect(status).toHaveBeenCalledWith(403);
  });
});
