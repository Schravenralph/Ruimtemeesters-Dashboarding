import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response } from 'express';

const mocks = vi.hoisted(() => {
  const insertCalls: Array<{ sql: string; params?: unknown[] }> = [];
  const queryMock = vi.fn(async (sql: string, params?: unknown[]) => {
    insertCalls.push({ sql, params });
    if (/INSERT INTO user_templates/.test(sql)) {
      return {
        rows: [{
          id: 'tpl-uuid',
          user_id: params![0],
          organization_id: params![1],
          name: params![2],
          description: params![3],
          source_theme_slug: params![4],
          tiles: JSON.parse(params![5] as string),
          layout: JSON.parse(params![6] as string),
          visibility: params![7],
          version: 1,
          created_at: '2026-05-12T19:00:00Z',
          updated_at: '2026-05-12T19:00:00Z',
        }],
        rowCount: 1,
      };
    }
    return { rows: [], rowCount: 0 };
  });
  return { queryMock, insertCalls };
});

vi.mock('../db/pool.js', () => ({
  query: mocks.queryMock,
  pool: {} as unknown,
  getClient: vi.fn(),
}));

import { createUserTemplate } from './user-template.controller';

function makeRes(): { res: Response; status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> } {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const res = { json, status } as unknown as Response;
  return { res, status, json };
}

beforeEach(() => {
  mocks.insertCalls.length = 0;
  mocks.queryMock.mockClear();
});

afterEach(() => vi.clearAllMocks());

const validBody = {
  name: 'My Wonen Snapshot',
  description: 'A working set of wonen tiles',
  sourceThemeSlug: 'wonen',
  tiles: [{ id: 't1', title: 'Bevolking', chartType: 'line', dataSource: 'bevolking', dimensions: [], defaultGeoLevel: 'gemeente' }],
  layout: [{ i: 't1', x: 0, y: 0, w: 6, h: 4 }],
  visibility: 'private' as const,
};

describe('createUserTemplate', () => {
  it('401s without an authenticated user', async () => {
    const { res, status, json } = makeRes();
    const req = { body: validBody } as Request;
    await createUserTemplate(req, res);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(mocks.queryMock).not.toHaveBeenCalled();
  });

  it('400s when the user has no organization', async () => {
    const { res, status, json } = makeRes();
    const req = { user: { id: 'u1', email: 'a@x.com', name: 'A', role: 'editor', organizationId: null, attributes: {} }, body: validBody } as unknown as Request;
    await createUserTemplate(req, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('organization') }));
  });

  it('400s on invalid body (missing name)', async () => {
    const { res, status } = makeRes();
    const req = { user: { id: 'u1', email: 'a@x.com', name: 'A', role: 'editor', organizationId: 'o1', attributes: {} }, body: { ...validBody, name: '' } } as unknown as Request;
    await createUserTemplate(req, res);
    expect(status).toHaveBeenCalledWith(400);
  });

  it('inserts with user_id + organization_id from req.user and returns the row', async () => {
    const { res, status, json } = makeRes();
    const req = {
      user: { id: 'user-1', email: 'a@x.com', name: 'A', role: 'editor', organizationId: 'org-1', attributes: {} },
      body: validBody,
    } as unknown as Request;
    await createUserTemplate(req, res);
    expect(status).toHaveBeenCalledWith(201);
    const insertCall = mocks.insertCalls.find(c => /INSERT INTO user_templates/.test(c.sql));
    expect(insertCall?.params?.[0]).toBe('user-1');
    expect(insertCall?.params?.[1]).toBe('org-1');
    expect(insertCall?.params?.[7]).toBe('private');
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      organizationId: 'org-1',
      name: 'My Wonen Snapshot',
      visibility: 'private',
    }));
  });

  it('defaults visibility to private when not provided', async () => {
    const { res, status } = makeRes();
    const body = { ...validBody };
    delete (body as Partial<typeof body>).visibility;
    const req = {
      user: { id: 'user-1', email: 'a@x.com', name: 'A', role: 'editor', organizationId: 'org-1', attributes: {} },
      body,
    } as unknown as Request;
    await createUserTemplate(req, res);
    expect(status).toHaveBeenCalledWith(201);
    const insertCall = mocks.insertCalls.find(c => /INSERT INTO user_templates/.test(c.sql));
    expect(insertCall?.params?.[7]).toBe('private');
  });

  it('passes description and sourceThemeSlug through verbatim', async () => {
    const { res } = makeRes();
    const req = {
      user: { id: 'user-1', email: 'a@x.com', name: 'A', role: 'editor', organizationId: 'org-1', attributes: {} },
      body: validBody,
    } as unknown as Request;
    await createUserTemplate(req, res);
    const insertCall = mocks.insertCalls.find(c => /INSERT INTO user_templates/.test(c.sql));
    expect(insertCall?.params?.[3]).toBe(validBody.description);
    expect(insertCall?.params?.[4]).toBe(validBody.sourceThemeSlug);
  });
});
