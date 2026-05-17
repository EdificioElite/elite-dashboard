import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminAerotermiaPage from '../pages/AdminAerotermiaPage';

vi.mock('../api/client', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('../store/auth', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 1, email: 'admin@test.com', vecino_piso: null, is_admin: true },
    loading: false,
  })),
}));

import { apiFetch } from '../api/client';
const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminAerotermiaPage />
    </MemoryRouter>
  );
}

describe('AdminAerotermiaPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders header title', async () => {
    mockApiFetch.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Aerotermia Admin')).toBeInTheDocument();
    });
  });

  it('renders eyebrow', async () => {
    mockApiFetch.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Panel de administracion')).toBeInTheDocument();
    });
  });

  it('fetches facturas on mount', async () => {
    mockApiFetch.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith('/admin/aerotermia/facturas');
    });
  });

  it('shows sections when data is loaded', async () => {
    mockApiFetch.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Distribucion por vecino')).toBeInTheDocument();
      expect(screen.getByText('Consumo por vecino')).toBeInTheDocument();
      expect(screen.getByText('Historico — Global')).toBeInTheDocument();
      expect(screen.getAllByText('No hay facturas disponibles').length).toBeGreaterThan(0);
      expect(screen.getByText('Desglose por factura')).toBeInTheDocument();
      expect(screen.getByText('Heatmap mensual')).toBeInTheDocument();
    });
  });
});
