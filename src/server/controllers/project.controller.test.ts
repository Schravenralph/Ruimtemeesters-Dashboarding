import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

const queryMock = vi.fn();
vi.mock('../db/pool.js', () => ({
  query: (...args: unknown[]) => queryMock(...args),
  getClient: vi.fn(),
}));

const { getProjectDashboard, putProjectDashboardLayout } = await import('./project.controller.js');

interface AuthRequest extends Request {
  user?: { id: string; organizationId: string | null };
}

function makeRes() {
  const res: Partial<Response> & { _status?: number; _body?: unknown } = {};
  res.status = vi.fn().mockImplementation((c: number) => { res._status = c; return res as Response; });
  res.json = vi.fn().mockImplementation((b: unknown) => { res._body = b; return res as Response; });
  return res as Response & { _status?: number; _body?: unknown };
}

function makeReq(over: Partial<AuthRequest> = {}): AuthRequest {
  return { params: {}, body: {}, query: {}, user: { id: 'u1', organizationId: 'org-1' }, ...over } as AuthRequest;
}

beforeEach(() => { queryMock.mockReset(); });

describe('getProjectDashboard', () => {
  it('returns 401 when unauthenticated', async () => {
    const req = makeReq({ user: undefined });
    const res = makeRes();
    await getProjectDashboard(req, res);
    expect(res._status).toBe(401);
  });

  it('returns 403 when user has no org', async () => {
    const req = makeReq({ user: { id: 'u1', organizationId: null } });
    const res = makeRes();
    await getProjectDashboard(req, res);
    expect(res._status).toBe(403);
  });

  it('returns 400 when params missing', async () => {
    const req = makeReq({ params: { idOrSlug: 'wonen-eindhoven' } });
    const res = makeRes();
    await getProjectDashboard(req, res);
    expect(res._status).toBe(400);
  });

  it('returns 404 when project not found', async () => {
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const req = makeReq({ params: { idOrSlug: 'missing', dashboardSlug: 'wonen' } });
    const res = makeRes();
    await getProjectDashboard(req, res);
    expect(res._status).toBe(404);
    expect(res._body).toEqual({ error: 'Project not found' });
  });

  it('returns 404 when dashboard not found within project', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: 'p1' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const req = makeReq({ params: { idOrSlug: 'wonen-eindhoven', dashboardSlug: 'bevolking' } });
    const res = makeRes();
    await getProjectDashboard(req, res);
    expect(res._status).toBe(404);
    expect(res._body).toEqual({ error: 'Dashboard not found' });
  });

  it('returns dashboard with tiles + layout when found', async () => {
    const dashboardRow = {
      id: 'd1', project_id: 'p1', source_theme_slug: 'wonen-bevolking',
      source_template_version: 1, name: 'Bevolking', slug: 'bevolking',
      tiles: [{ id: 't1', title: 'Bevolking totaal', chartType: 'number', dataSource: 'bevolking' }],
      layout: [{ i: 't1', x: 0, y: 0, w: 6, h: 4 }],
      is_default: true,
    };
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: 'p1' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [dashboardRow], rowCount: 1 });
    const req = makeReq({ params: { idOrSlug: 'wonen-eindhoven', dashboardSlug: 'bevolking' } });
    const res = makeRes();
    await getProjectDashboard(req, res);
    expect(res._status).toBeUndefined(); // implicit 200
    expect(res._body).toMatchObject({
      id: 'd1', projectId: 'p1', sourceThemeSlug: 'wonen-bevolking',
      sourceTemplateVersion: 1, name: 'Bevolking', slug: 'bevolking',
      tiles: dashboardRow.tiles, layout: dashboardRow.layout, isDefault: true,
    });
  });

  it('resolves project by UUID when idOrSlug is a UUID', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: 'p1' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 'd1', project_id: 'p1', source_theme_slug: 't', source_template_version: 1, name: 'n', slug: 's', tiles: [], layout: [], is_default: true }], rowCount: 1 });
    const req = makeReq({ params: { idOrSlug: '6c6e2f3a-2c9a-4e6a-9a3b-1234567890ab', dashboardSlug: 's' } });
    const res = makeRes();
    await getProjectDashboard(req, res);
    // First call should be a UUID-based lookup
    const firstCall = queryMock.mock.calls[0];
    expect(firstCall[0]).toMatch(/id = \$2/);
    expect(firstCall[1]).toEqual(['org-1', '6c6e2f3a-2c9a-4e6a-9a3b-1234567890ab']);
  });
});

describe('putProjectDashboardLayout', () => {
  it('returns 400 when layout is not an array', async () => {
    const req = makeReq({ params: { idOrSlug: 'wonen-eindhoven', dashboardSlug: 'bevolking' }, body: { layout: 'oops' } });
    const res = makeRes();
    await putProjectDashboardLayout(req, res);
    expect(res._status).toBe(400);
  });

  it('persists layout and returns ok when project + dashboard exist', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: 'p1' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 'd1' }], rowCount: 1 });
    const layout = [{ i: 't1', x: 0, y: 0, w: 6, h: 4 }];
    const req = makeReq({ params: { idOrSlug: 'wonen-eindhoven', dashboardSlug: 'bevolking' }, body: { layout } });
    const res = makeRes();
    await putProjectDashboardLayout(req, res);
    expect(res._body).toEqual({ ok: true });
    // The UPDATE should have been invoked with JSON-serialized layout
    const updateCall = queryMock.mock.calls[1];
    expect(updateCall[0]).toMatch(/UPDATE project_dashboards/);
    expect(updateCall[1]).toEqual(['p1', 'bevolking', JSON.stringify(layout)]);
  });

  it('returns 404 when dashboard slug does not exist within project', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: 'p1' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const req = makeReq({ params: { idOrSlug: 'p', dashboardSlug: 'missing' }, body: { layout: [] } });
    const res = makeRes();
    await putProjectDashboardLayout(req, res);
    expect(res._status).toBe(404);
  });
});
