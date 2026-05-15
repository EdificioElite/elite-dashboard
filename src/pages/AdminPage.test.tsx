import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminPage from './AdminPage';

vi.mock('../store/auth', () => ({
  useAuthStore: vi.fn((selector?: string) => {
    const state = {
      user: { id: 1, vecinoPiso: '1A', email: 'admin@elite.com', isAdmin: true },
    };
    if (selector === 'user') return state.user;
    if (typeof selector === 'function') return selector(state);
    return state;
  }),
}));

vi.mock('../api/client', () => ({
  apiFetch: vi.fn().mockResolvedValue([
    {
      piso: '1A',
      nombre: 'Vecino 1A',
      user_id: 1,
      email: 'admin@elite.com',
      vecino_email: 'vecino1a@elite.com',
      is_admin: true,
      coeficiente: '0.20',
      enviar_email: false,
      device_identification: 'DEVID001',
      serial_number: '10000001',
    },
    {
      piso: '2A',
      nombre: 'Vecino 2A',
      user_id: null,
      email: null,
      vecino_email: null,
      is_admin: false,
      coeficiente: '0.20',
      enviar_email: false,
      device_identification: 'DEVID002',
      serial_number: '10000002',
    },
  ]),
}));

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders admin panel heading', async () => {
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Vecinos' })).toBeInTheDocument();
    expect(screen.getByText('Panel de administracion')).toBeInTheDocument();
  });

  it('shows email login column header', async () => {
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    expect(await screen.findByText('Email login')).toBeInTheDocument();
  });

  it('shows role column header', async () => {
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    expect(await screen.findByText('Rol')).toBeInTheDocument();
  });

  it('shows stats after loading', async () => {
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Vecinos' })).toBeInTheDocument();
    expect(screen.getByText('Con acceso')).toBeInTheDocument();
  });

  it('shows vecino rows with login email', async () => {
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    expect(await screen.findByText('1A')).toBeInTheDocument();
    expect(screen.getByText('Vecino 1A')).toBeInTheDocument();
    expect(screen.getByText('admin@elite.com')).toBeInTheDocument();
  });

  it('shows vecino without login email as —', async () => {
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    expect(await screen.findByText('2A')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });

  it('shows admin role chip', async () => {
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    expect(await screen.findByText('Admin')).toBeInTheDocument();
  });

  it('shows vecino role chip', async () => {
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    expect(await screen.findByText('Vecino')).toBeInTheDocument();
  });

  it('shows Crear acceso button', async () => {
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    expect(await screen.findByText('Crear acceso')).toBeInTheDocument();
  });
});
