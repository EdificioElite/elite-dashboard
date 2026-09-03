import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { apiFetch } from '../api/client';
import UsuariosPage from '../pages/UsuariosPage';

vi.mock('../api/client', () => ({
  apiFetch: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock('../store/auth', () => ({
  useAuthStore: vi.fn((selector?: any) => {
    const state = { user: { id: 1, role: 'admin', email: 'admin@x.com', vecino_piso: '1A' }, token: 't', loading: false };
    return selector ? selector(state) : state;
  }),
}));

const usuarios = [
  { id: 1, vecino_piso: '2A', email: 'b@x.com', role: 'usuario', created_at: '2026-01-01T00:00:00Z', ultima_conexion: null, ultima_consulta_ha: null },
  { id: 2, vecino_piso: null, email: 'c@x.com', role: 'admin', created_at: '2026-01-01T00:00:00Z', ultima_conexion: null, ultima_consulta_ha: null },
  { id: 3, vecino_piso: '1A', email: 'a@x.com', role: 'usuario', created_at: '2026-01-01T00:00:00Z', ultima_conexion: null, ultima_consulta_ha: null },
  { id: 4, vecino_piso: '10A', email: 'd@x.com', role: 'directiva', created_at: '2026-01-01T00:00:00Z', ultima_conexion: null, ultima_consulta_ha: null },
];

function getEmailOrder(): string[] {
  return Array.from(document.querySelectorAll('tbody tr td:first-child')).map((td) => td.textContent || '');
}

describe('UsuariosPage', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockResolvedValue(usuarios);
  });

  it('ordena por piso por defecto (sin piso primero, luego numérico + letra)', async () => {
    render(<MemoryRouter><UsuariosPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('a@x.com')).toBeInTheDocument());
    expect(getEmailOrder()).toEqual(['c@x.com', 'a@x.com', 'b@x.com', 'd@x.com']);
  });

  it('ordena por Email al hacer clic en su cabecera (asc y desc)', async () => {
    render(<MemoryRouter><UsuariosPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('a@x.com')).toBeInTheDocument());

    const emailHeader = screen.getByRole('button', { name: 'Email' });
    fireEvent.click(emailHeader);
    expect(getEmailOrder()).toEqual(['a@x.com', 'b@x.com', 'c@x.com', 'd@x.com']);

    fireEvent.click(emailHeader);
    expect(getEmailOrder()).toEqual(['d@x.com', 'c@x.com', 'b@x.com', 'a@x.com']);
  });
});
