import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RegistroPage from './RegistroPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../api/client', () => ({
  verifyToken: vi.fn(),
}));

let mockRegisterFromInvite = vi.fn();

vi.mock('../store/auth', () => ({
  useAuthStore: vi.fn((selector: any) => {
    const state = { registerFromInvite: mockRegisterFromInvite };
    return selector ? selector(state) : state;
  }),
}));

import { verifyToken } from '../api/client';
const mockVerifyToken = verifyToken as ReturnType<typeof vi.fn>;

describe('RegistroPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockNavigate.mockClear();
    mockRegisterFromInvite.mockClear();
  });

  it('shows invalid link when token is missing', async () => {
    render(
      <MemoryRouter initialEntries={['/registro']}>
        <Routes><Route path="/registro" element={<RegistroPage />} /></Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/invalido/i)).toBeInTheDocument();
    });
  });

  it('shows error when token verification fails', async () => {
    mockVerifyToken.mockRejectedValueOnce(new Error('bad'));
    render(
      <MemoryRouter initialEntries={['/registro?token=bad']}>
        <Routes><Route path="/registro" element={<RegistroPage />} /></Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/expirado/i)).toBeInTheDocument();
    });
  });

  it('shows error when token type is reset', async () => {
    mockVerifyToken.mockResolvedValueOnce({ email: 'a@a.com', piso: '2A', type: 'reset' });
    render(
      <MemoryRouter initialEntries={['/registro?token=reset-token']}>
        <Routes><Route path="/registro" element={<RegistroPage />} /></Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/invalido/i)).toBeInTheDocument();
    });
  });

  it('renders form with email and piso when token is valid', async () => {
    mockVerifyToken.mockResolvedValueOnce({ email: 'a@a.com', piso: '2A', type: 'invite' });
    render(
      <MemoryRouter initialEntries={['/registro?token=valid']}>
        <Routes><Route path="/registro" element={<RegistroPage />} /></Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByDisplayValue('a@a.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2A')).toBeInTheDocument();
    });
  });

  it('shows error when passwords do not match', async () => {
    mockVerifyToken.mockResolvedValueOnce({ email: 'a@a.com', piso: '2A', type: 'invite' });
    render(
      <MemoryRouter initialEntries={['/registro?token=valid']}>
        <Routes><Route path="/registro" element={<RegistroPage />} /></Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByDisplayValue('a@a.com')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Contrasena', { exact: true }), 'password123');
    await user.type(screen.getByLabelText('Confirmar contrasena'), 'different123');
    await user.click(screen.getByRole('button', { name: /Registrarse/i }));

    await waitFor(() => {
      expect(screen.getByText(/no coinciden/i)).toBeInTheDocument();
    });
  });

  it('calls registerFromInvite with token and password on submit', async () => {
    mockVerifyToken.mockResolvedValueOnce({ email: 'a@a.com', piso: '2A', type: 'invite' });
    render(
      <MemoryRouter initialEntries={['/registro?token=valid']}>
        <Routes><Route path="/registro" element={<RegistroPage />} /></Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByDisplayValue('a@a.com')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Contrasena', { exact: true }), 'password123');
    await user.type(screen.getByLabelText('Confirmar contrasena'), 'password123');
    await user.click(screen.getByRole('button', { name: /Registrarse/i }));

    await waitFor(() => {
      expect(mockRegisterFromInvite).toHaveBeenCalledWith('valid', 'password123');
    });
  });

  it('redirects to /inicio after successful registration', async () => {
    mockRegisterFromInvite.mockResolvedValueOnce(undefined);
    mockVerifyToken.mockResolvedValueOnce({ email: 'a@a.com', piso: '2A', type: 'invite' });
    render(
      <MemoryRouter initialEntries={['/registro?token=valid']}>
        <Routes><Route path="/registro" element={<RegistroPage />} /></Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByDisplayValue('a@a.com')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Contrasena', { exact: true }), 'password123');
    await user.type(screen.getByLabelText('Confirmar contrasena'), 'password123');
    await user.click(screen.getByRole('button', { name: /Registrarse/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/inicio');
    });
  });
});
