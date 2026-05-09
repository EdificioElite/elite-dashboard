import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from './auth';

vi.mock('../api/client', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../api/client';

describe('auth store', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, token: null, loading: true });
  });

  it('starts with loading true', () => {
    expect(useAuthStore.getState().loading).toBe(true);
  });

  it('login stores token and user', async () => {
    const mockFetch = apiFetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce({
      token: 'test-token',
      user: { id: 1, vecino_id: 10, email: 'test@test.com', is_admin: false },
    });

    await useAuthStore.getState().login('test@test.com', 'password123');

    expect(localStorage.getItem('token')).toBe('test-token');
    expect(useAuthStore.getState().user?.email).toBe('test@test.com');
    expect(useAuthStore.getState().token).toBe('test-token');
  });

  it('logout clears everything', async () => {
    const mockFetch = apiFetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce({
      token: 'test-token',
      user: { id: 1, vecino_id: 10, email: 'test@test.com', is_admin: false },
    });
    await useAuthStore.getState().login('test@test.com', 'password');

    useAuthStore.getState().logout();

    expect(localStorage.getItem('token')).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('checkAuth validates existing token', async () => {
    localStorage.setItem('token', 'existing-token');
    const mockFetch = apiFetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce({ id: 1, vecino_id: 10, email: 'test@test.com', is_admin: false });

    await useAuthStore.getState().checkAuth();

    expect(useAuthStore.getState().user?.email).toBe('test@test.com');
    expect(useAuthStore.getState().loading).toBe(false);
  });

  it('checkAuth clears invalid token', async () => {
    localStorage.setItem('token', 'bad-token');
    const mockFetch = apiFetch as ReturnType<typeof vi.fn>;
    mockFetch.mockRejectedValueOnce(new Error('invalid'));

    await useAuthStore.getState().checkAuth();

    expect(localStorage.getItem('token')).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().loading).toBe(false);
  });

  it('checkAuth sets loading false when no token', async () => {
    await useAuthStore.getState().checkAuth();

    expect(useAuthStore.getState().loading).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });
});
