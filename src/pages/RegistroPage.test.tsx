import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

vi.mock('../store/auth', () => ({
  useAuthStore: vi.fn((selector) => {
    const state = { registerFromInvite: vi.fn() };
    return selector ? selector(state) : state;
  }),
}));

import { verifyToken } from '../api/client';
import { useAuthStore } from '../store/auth';
const mockVerifyToken = verifyToken as ReturnType<typeof vi.fn>;
const mockRegisterFromInvite = useAuthStore(() => ({})).registerFromInvite as ReturnType<typeof vi.fn>;

describe('RegistroPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockNavigate.mockClear();
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
});
