import { api } from './client';
import type { AuthResponse } from '@shared/api/contracts';

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/login', { email, password });
  api.setToken(response.token);
  localStorage.setItem('auth_token', response.token);
  return response;
}

export async function register(email: string, password: string, name: string): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/register', { email, password, name });
  api.setToken(response.token);
  localStorage.setItem('auth_token', response.token);
  return response;
}

export async function getMe() {
  return api.get<{ user: AuthResponse['user'] }>('/auth/me');
}

export function logout() {
  api.setToken(null);
  localStorage.removeItem('auth_token');
}

export function restoreToken(): string | null {
  const token = localStorage.getItem('auth_token');
  if (token) {
    api.setToken(token);
  }
  return token;
}
