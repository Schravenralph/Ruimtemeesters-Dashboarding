import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';

// Mock the auth API
vi.mock('../services/api/auth', () => ({
  login: vi.fn().mockResolvedValue({ token: 'test-token', user: { id: '1', email: 'test@test.nl', name: 'Test', role: 'viewer', organizationId: null, attributes: {}, createdAt: '2024-01-01' } }),
  register: vi.fn().mockResolvedValue({ token: 'test-token', user: { id: '1', email: 'test@test.nl', name: 'Test', role: 'viewer', organizationId: null, attributes: {}, createdAt: '2024-01-01' } }),
  getMe: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  logout: vi.fn(),
  restoreToken: vi.fn().mockReturnValue(null),
}));

import { AuthProvider, useAuth } from './AuthContext';

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthContext', () => {
  it('starts unauthenticated', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    // Wait for loading to complete
    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('provides login function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(typeof result.current.login).toBe('function');
  });

  it('provides register function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(typeof result.current.register).toBe('function');
  });

  it('provides logout function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(typeof result.current.logout).toBe('function');
  });

  it('login sets user', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await vi.waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('test@test.nl', 'password123');
    });

    expect(result.current.user).not.toBeNull();
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('logout clears user', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await vi.waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('test@test.nl', 'password123');
    });

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
