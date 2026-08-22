import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch } from './client';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('apiFetch silent refresh', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('retries request once after refreshing on 401', async () => {
    localStorage.setItem('token', 'expired-access');
    localStorage.setItem('refreshToken', 'valid-refresh');

    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: 'Token inválido o expirado' }))
      .mockResolvedValueOnce(
        jsonResponse(200, { token: 'new-access', refreshToken: 'new-refresh', user: { id: 1 } })
      )
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const result = await apiFetch<{ ok: boolean }>('/consumos');

    expect(result.ok).toBe(true);
    expect(localStorage.getItem('token')).toBe('new-access');
    expect(localStorage.getItem('refreshToken')).toBe('new-refresh');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('clears tokens and throws when refresh fails', async () => {
    localStorage.setItem('token', 'expired-access');
    localStorage.setItem('refreshToken', 'invalid-refresh');

    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: 'Token inválido o expirado' }))
      .mockResolvedValueOnce(jsonResponse(401, { error: 'Sesión expirada' }));

    await expect(apiFetch('/consumos')).rejects.toThrow('Sesión expirada');
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('does not attempt refresh on auth endpoints', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: 'Credenciales inválidas' }));

    await expect(
      apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({}) })
    ).rejects.toThrow('Credenciales inválidas');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
