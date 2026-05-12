const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getToken(): string | null {
  return localStorage.getItem('token');
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

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function updateUser(id: number, data: { email?: string; vecino_piso?: string | null; is_admin?: boolean }) {
  return apiFetch<{ id: number; vecino_piso: string | null; email: string; is_admin: boolean; created_at: string }>(
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
