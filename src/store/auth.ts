import { create } from 'zustand';
import { apiFetch } from '../api/client';
import type { Role } from '../lib/roles';

interface User {
  id: number;
  vecino_piso: string;
  email: string;
  role: Role;
  ultima_conexion: string | null;
  ultima_consulta_ha: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  heartbeat: () => Promise<void>;
  registerFromInvite: (token: string, password: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refreshToken'),
  loading: true,

  login: async (email: string, password: string) => {
    const data = await apiFetch<{ token: string; refreshToken: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.refreshToken);
    set({ token: data.token, refreshToken: data.refreshToken, user: data.user });
  },

  logout: () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      apiFetch('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    set({ token: null, refreshToken: null, user: null });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    if (!token && !refreshToken) {
      set({ loading: false });
      return;
    }
    try {
      const user = await apiFetch<User>('/auth/me');
      set({
        user,
        token: localStorage.getItem('token'),
        refreshToken: localStorage.getItem('refreshToken'),
        loading: false,
      });
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      set({ token: null, refreshToken: null, user: null, loading: false });
    }
  },

  heartbeat: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const user = await apiFetch<User>('/auth/me');
      set({
        user,
        token: localStorage.getItem('token'),
        refreshToken: localStorage.getItem('refreshToken'),
      });
    } catch {}
  },

  registerFromInvite: async (token: string, password: string) => {
    const data = await apiFetch<{ token: string; refreshToken: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.refreshToken);
    set({ token: data.token, refreshToken: data.refreshToken, user: data.user });
  },
}));
