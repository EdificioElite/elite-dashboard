import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminAerotermiaPage from '../pages/AdminAerotermiaPage';

vi.mock('../api/client', () => ({
  apiFetch: vi.fn((url: string) => {
    if (url === '/admin/aerotermia/facturas') return Promise.resolve([]);
    if (url === '/admin/aerotermia/cop') return Promise.resolve([]);
    if (url.includes('/admin/aerotermia/consumos')) return Promise.resolve([]);
    if (url === '/admin/aerotermia/en-vivo') return Promise.resolve(null);
    return Promise.resolve([]);
  }),
}));

describe('AdminAerotermiaPage', () => {
  it('renderiza la card Global en Vivo', async () => {
    render(<MemoryRouter><AdminAerotermiaPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Aerotermia Global en Vivo')).toBeInTheDocument();
    });
  });

  it('renderiza el buscador de vecinos', async () => {
    render(<MemoryRouter><AdminAerotermiaPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Buscar piso...')).toBeInTheDocument();
    });
  });

  it('renderiza las secciones principales', async () => {
    render(<MemoryRouter><AdminAerotermiaPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Histórico global')).toBeInTheDocument();
      expect(screen.getByText('Facturas')).toBeInTheDocument();
    });
  });

  it('no renderiza los KPI antiguos', async () => {
    render(<MemoryRouter><AdminAerotermiaPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.queryByText('Total kWh calor')).not.toBeInTheDocument();
      expect(screen.queryByText('Total facturado')).not.toBeInTheDocument();
      expect(screen.queryByText('Distribución por piso')).not.toBeInTheDocument();
    });
  });
});
