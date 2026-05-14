import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ResetPasswordPage from './ResetPasswordPage';

vi.mock('../api/client', () => ({
  verifyToken: vi.fn(),
  resetPassword: vi.fn(),
}));

import { verifyToken, resetPassword } from '../api/client';
const mockVerifyToken = verifyToken as ReturnType<typeof vi.fn>;
const mockResetPassword = resetPassword as ReturnType<typeof vi.fn>;

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows invalid link when token is missing', async () => {
    render(
      <MemoryRouter initialEntries={['/resetear-contrasena']}>
        <Routes><Route path="/resetear-contrasena" element={<ResetPasswordPage />} /></Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/invalido/i)).toBeInTheDocument();
    });
  });

  it('shows error when token verification fails', async () => {
    mockVerifyToken.mockRejectedValueOnce(new Error('bad'));
    render(
      <MemoryRouter initialEntries={['/resetear-contrasena?token=bad']}>
        <Routes><Route path="/resetear-contrasena" element={<ResetPasswordPage />} /></Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/expirado/i)).toBeInTheDocument();
    });
  });

  it('renders form when token is valid', async () => {
    mockVerifyToken.mockResolvedValueOnce({ email: 'a@a.com', piso: null, type: 'reset' });
    render(
      <MemoryRouter initialEntries={['/resetear-contrasena?token=valid']}>
        <Routes><Route path="/resetear-contrasena" element={<ResetPasswordPage />} /></Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByLabelText('Nueva contrasena')).toBeInTheDocument();
    });
  });

  it('shows error when passwords do not match', async () => {
    mockVerifyToken.mockResolvedValueOnce({ email: 'a@a.com', piso: null, type: 'reset' });
    render(
      <MemoryRouter initialEntries={['/resetear-contrasena?token=valid']}>
        <Routes><Route path="/resetear-contrasena" element={<ResetPasswordPage />} /></Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByLabelText('Nueva contrasena')).toBeInTheDocument();
    });
    await userEvent.type(screen.getByLabelText('Nueva contrasena'), 'password123');
    await userEvent.type(screen.getByLabelText('Confirmar contrasena'), 'different123');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar contrasena' }));
    await waitFor(() => {
      expect(screen.getByText(/no coinciden/i)).toBeInTheDocument();
    });
  });

  it('calls resetPassword on successful submit', async () => {
    mockVerifyToken.mockResolvedValueOnce({ email: 'a@a.com', piso: null, type: 'reset' });
    mockResetPassword.mockResolvedValueOnce({ message: 'ok' });
    render(
      <MemoryRouter initialEntries={['/resetear-contrasena?token=valid']}>
        <Routes><Route path="/resetear-contrasena" element={<ResetPasswordPage />} /></Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByLabelText('Nueva contrasena')).toBeInTheDocument();
    });
    await userEvent.type(screen.getByLabelText('Nueva contrasena'), 'password123');
    await userEvent.type(screen.getByLabelText('Confirmar contrasena'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar contrasena' }));
    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('valid', 'password123');
      expect(screen.getByText(/actualizada correctamente/i)).toBeInTheDocument();
    });
  });

  it('shows error when API rejects on submit', async () => {
    mockVerifyToken.mockResolvedValueOnce({ email: 'a@a.com', piso: null, type: 'reset' });
    mockResetPassword.mockRejectedValueOnce(new Error('API error'));
    render(
      <MemoryRouter initialEntries={['/resetear-contrasena?token=valid']}>
        <Routes><Route path="/resetear-contrasena" element={<ResetPasswordPage />} /></Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByLabelText('Nueva contrasena')).toBeInTheDocument();
    });
    await userEvent.type(screen.getByLabelText('Nueva contrasena'), 'password123');
    await userEvent.type(screen.getByLabelText('Confirmar contrasena'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar contrasena' }));
    await waitFor(() => {
      expect(screen.getByText('API error')).toBeInTheDocument();
    });
  });

  it('shows error when token type is invite instead of reset', async () => {
    mockVerifyToken.mockResolvedValueOnce({ email: 'a@a.com', piso: '1A', type: 'invite' });
    render(
      <MemoryRouter initialEntries={['/resetear-contrasena?token=invite']}>
        <Routes><Route path="/resetear-contrasena" element={<ResetPasswordPage />} /></Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/invalido/i)).toBeInTheDocument();
    });
  });
});
