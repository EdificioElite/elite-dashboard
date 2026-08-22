const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const ACCESS_KEY = 'token';
const REFRESH_KEY = 'refreshToken';

function getToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

const AUTH_ENDPOINTS = new Set([
  '/auth/login',
  '/auth/refresh',
  '/auth/register',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/reset-password',
]);

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token');

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    // Solo limpiamos tokens si el refresh token es inválido/expirado (400/401).
    // Ante errores transitorios (5xx/red) conservamos la sesión para reintentar.
    if (response.status === 400 || response.status === 401) {
      clearTokens();
    }
    throw new Error(body.error || 'Refresh failed');
  }

  const data = await response.json();
  setTokens(data.token, data.refreshToken);
  return data.token;
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && !AUTH_ENDPOINTS.has(endpoint) && getRefreshToken()) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    const newToken = await refreshPromise;

    const retryHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
      Authorization: `Bearer ${newToken}`,
    };

    const retryResponse = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: retryHeaders,
    });

    if (!retryResponse.ok) {
      const body = await retryResponse.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${retryResponse.status}`);
    }

    return retryResponse.json();
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${response.status}`);
  }

  return response.json();
}

import type { Role } from '../lib/roles';

export async function updateUser(id: number, data: { email?: string; vecino_piso?: string | null; role?: Role }) {
  return apiFetch<{ id: number; vecino_piso: string | null; email: string; role: Role; created_at: string }>(
    `/admin/usuarios/${id}`,
    { method: 'PUT', body: JSON.stringify(data) }
  );
}

export async function changePassword(id: number, password: string) {
  return apiFetch<{ message: string }>(
    `/admin/usuarios/${id}/password`,
    { method: 'PUT', body: JSON.stringify({ password }) }
  );
}

export async function changeOwnPassword(currentPassword: string, newPassword: string) {
  return apiFetch<{ message: string }>('/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function deleteUser(id: number) {
  return apiFetch<{ message: string }>(
    `/admin/usuarios/${id}`,
    { method: 'DELETE' }
  );
}

export async function forgotPassword(email: string) {
  return apiFetch<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function verifyToken(token: string) {
  return apiFetch<{ email: string; piso: string | null; type: 'invite' | 'reset' }>(
    `/auth/verify-token?token=${encodeURIComponent(token)}`
  );
}

export async function resetPassword(token: string, password: string) {
  return apiFetch<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

export async function inviteUser(email: string, vecinoPiso?: string) {
  return apiFetch<{ message: string }>('/admin/usuarios', {
    method: 'POST',
    body: JSON.stringify({ email, vecino_piso: vecinoPiso || undefined }),
  });
}

// --- Juntas ---

interface Junta {
  id: number;
  tipo: string;
  fecha: string;
  file_name: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchJuntas(tipo?: string): Promise<Junta[]> {
  const params = tipo ? `?tipo=${encodeURIComponent(tipo)}` : '';
  return apiFetch<Junta[]>(`/juntas${params}`);
}

export async function downloadJuntaPDF(id: number): Promise<void> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_URL}/juntas/${id}`, { headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${response.status}`);
  }
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  const filename = match ? match[1].replace(/['"]/g, '') : `junta-${id}.pdf`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function apiForm<T>(endpoint: string, method: string, formData: FormData): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: formData,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export async function createJunta(data: { tipo: string; fecha: string; archivo?: File | null }): Promise<Junta> {
  const formData = new FormData();
  formData.append('tipo', data.tipo);
  formData.append('fecha', data.fecha);
  if (data.archivo) {
    formData.append('archivo', data.archivo);
  }
  return apiForm<Junta>('/admin/juntas', 'POST', formData);
}

export async function updateJunta(
  id: number,
  data: { tipo?: string; fecha?: string; archivo?: File | null }
): Promise<Junta> {
  const formData = new FormData();
  if (data.tipo) formData.append('tipo', data.tipo);
  if (data.fecha) formData.append('fecha', data.fecha);
  if (data.archivo) formData.append('archivo', data.archivo);
  return apiForm<Junta>(`/admin/juntas/${id}`, 'PUT', formData);
}

export async function deleteJunta(id: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/admin/juntas/${id}`, { method: 'DELETE' });
}
