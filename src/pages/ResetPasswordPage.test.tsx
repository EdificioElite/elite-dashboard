import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ResetPasswordPage from './ResetPasswordPage';

vi.mock('../api/client', () => ({
  verifyToken: vi.fn(),
  resetPassword: vi.fn(),
}));

import { verifyToken } from '../api/client';
const mockVerifyToken = verifyToken as ReturnType<typeof vi.fn>;

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
});
