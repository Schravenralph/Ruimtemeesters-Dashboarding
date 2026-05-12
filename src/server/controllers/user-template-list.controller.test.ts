import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response } from 'express';

const mocks = vi.hoisted(() => {
  const calls: Array<{ sql: string; params?: unknown[] }> = [];
  const dbState = { rows: [] as Array<Record<string, unknown>> };
  const queryMock = vi.fn(async (sql: string, params?: unknown[]) => {
    calls.push({ sql, params });
    return { rows: dbState.rows, rowCount: dbState.rows.length };
  });
  return { queryMock, calls, dbState };
});

vi.mock('../db/pool.js', () => ({ query: mocks.queryMock, pool: {} as unknown, getClient: vi.fn() }));

import { listUserTemplates } from './user-template.controller';

function makeRes(): { res: Response; status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> } {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { res: { json, status } as unknown as Response, status, json };
}

const adminUser = { id: 'u1', email: 'a@x.com', name: 'A', role: 'admin', organizationId: 'org-1', attributes: {} };

beforeEach(() => {
  mocks.calls.length = 0;
  mocks.dbState.rows = [];
  mocks.queryMock.mockClear();
});
afterEach(() => vi.clearAllMocks());

describe('listUserTemplates', () => {
  it('401s without auth', async () => {
    const { res, status, json } = makeRes();
    await listUserTemplates({ query: {} } as Request, res);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'Authentication required' });
  });

  it('400s on unknown scope', async () => {
    const { res, status } = makeRes();
    await listUserTemplates({ user: adminUser, query: { scope: 'bogus' } } as unknown as Request, res);
    expect(status).toHaveBeenCalledWith(400);
  });

  it('scope=mine filters by user_id', async () => {
    const { res, json } = makeRes();
    mocks.dbState.rows = [{ id: 'tpl', user_id: 'u1', organization_id: 'org-1', name: 'X', description: null, source_theme_slug: null, tiles: [], layout: [], visibility: 'private', version: 1, created_at: 't', updated_at: 't' }];
    await listUserTemplates({ user: adminUser, query: { scope: 'mine' } } as unknown as Request, res);
    const call = mocks.calls.find(c => /FROM user_templates/.test(c.sql));
    expect(call?.sql).toMatch(/user_id = \$1/);
    expect(call?.params).toEqual(['u1']);
    expect(json).toHaveBeenCalledWith({ rows: expect.arrayContaining([expect.objectContaining({ id: 'tpl', userId: 'u1' })]) });
  });

  it('scope=org filters by organization_id and visibility=org', async () => {
    const { res } = makeRes();
    await listUserTemplates({ user: adminUser, query: { scope: 'org' } } as unknown as Request, res);
    const call = mocks.calls.find(c => /FROM user_templates/.test(c.sql));
    expect(call?.sql).toMatch(/organization_id = \$1/);
    expect(call?.sql).toMatch(/visibility = 'org'/);
    expect(call?.params).toEqual(['org-1']);
  });

  it('scope=org returns [] when user has no organization', async () => {
    const { res, json } = makeRes();
    const userNoOrg = { ...adminUser, organizationId: null };
    await listUserTemplates({ user: userNoOrg, query: { scope: 'org' } } as unknown as Request, res);
    expect(json).toHaveBeenCalledWith({ rows: [] });
    expect(mocks.queryMock).not.toHaveBeenCalled();
  });

  it('scope=public has no parameter filter', async () => {
    const { res } = makeRes();
    await listUserTemplates({ user: adminUser, query: { scope: 'public' } } as unknown as Request, res);
    const call = mocks.calls.find(c => /FROM user_templates/.test(c.sql));
    expect(call?.sql).toMatch(/visibility = 'public'/);
    expect(call?.params).toEqual([]);
  });

  it('defaults to scope=mine when no query param', async () => {
    const { res } = makeRes();
    await listUserTemplates({ user: adminUser, query: {} } as unknown as Request, res);
    const call = mocks.calls.find(c => /FROM user_templates/.test(c.sql));
    expect(call?.sql).toMatch(/user_id = \$1/);
  });
});
