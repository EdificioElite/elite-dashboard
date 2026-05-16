import { create } from 'zustand';
import { apiFetch } from '../api/client';

interface User {
  id: number;
  vecino_piso: string;
  email: string;
  is_admin: boolean;
  ultima_conexion: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  registerFromInvite: (token: string, password: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  loading: true,

  login: async (email: string, password: string) => {
    const data = await apiFetch<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('token', data.token);
    set({ token: data.token, user: data.user });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ loading: false });
      return;
    }
    try {
      const user = await apiFetch<User>('/auth/me');
      set({ user, token, loading: false });
    } catch {
      localStorage.removeItem('token');
      set({ token: null, user: null, loading: false });
    }
  },

  registerFromInvite: async (token: string, password: string) => {
    const data = await apiFetch<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
    localStorage.setItem('token', data.token);
    set({ token: data.token, user: data.user });
  },
}));
