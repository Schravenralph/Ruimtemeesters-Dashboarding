import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, ApiError } from './client';

describe('ApiClient', () => {
  beforeEach(() => {
    api.setToken(null);
    vi.restoreAllMocks();
  });

  it('sets and gets token', () => {
    expect(api.getToken()).toBeNull();
    api.setToken('test-token');
    expect(api.getToken()).toBe('test-token');
  });

  it('includes authorization header when token is set', async () => {
    api.setToken('my-token');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: 'test' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await api.get('/test');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-token',
        }),
      }),
    );
  });

  it('does not include authorization header when no token', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: 'test' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await api.get('/test');

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers.Authorization).toBeUndefined();
  });

  it('adds query params to URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: 'test' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await api.get('/test', { source: 'bevolking', year: 2024 });

    expect(mockFetch.mock.calls[0][0]).toContain('source=bevolking');
    expect(mockFetch.mock.calls[0][0]).toContain('year=2024');
  });

  it('skips undefined params', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: 'test' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await api.get('/test', { source: 'bevolking', year: undefined });

    expect(mockFetch.mock.calls[0][0]).toContain('source=bevolking');
    expect(mockFetch.mock.calls[0][0]).not.toContain('year');
  });

  it('throws ApiError on non-OK response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.resolve({ error: 'Not found' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(api.get('/test')).rejects.toThrow(ApiError);
    await expect(api.get('/test')).rejects.toThrow('Not found');
  });

  it('sends JSON body for POST', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ id: '123' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await api.post('/test', { name: 'Test', value: 42 });

    expect(mockFetch.mock.calls[0][1].body).toBe(JSON.stringify({ name: 'Test', value: 42 }));
  });

  it('returns undefined for 204 responses', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await api.delete('/test/123');
    expect(result).toBeUndefined();
  });
});
