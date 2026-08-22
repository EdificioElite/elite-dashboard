import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { apiFetch } from '../api/client';
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

function recentPeriod(monthsBack: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsBack);
  return d.toISOString();
}

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

  it('renderiza la tabla pivote de facturas con datos', async () => {
    vi.mocked(apiFetch).mockImplementation((url: string) => {
      if (url === '/admin/aerotermia/facturas') return Promise.resolve([
        { id_factura: 'F1', piso: '1A', periodo: recentPeriod(2), importe_total: 100, importe_fijo: 10, kwh_calor: 50, kwh_frio: 10, kwh_acs: 5, m3_acs: 1, importe_calor: 30, importe_frio: 5, importe_variable_acs: 2, importe_acs: 15 },
        { id_factura: 'F1', piso: '1B', periodo: recentPeriod(2), importe_total: 80, importe_fijo: 10, kwh_calor: 40, kwh_frio: 8, kwh_acs: 4, m3_acs: 0.8, importe_calor: 25, importe_frio: 4, importe_variable_acs: 1.5, importe_acs: 12 },
        { id_factura: 'F2', piso: '1A', periodo: recentPeriod(1), importe_total: 120, importe_fijo: 10, kwh_calor: 60, kwh_frio: 12, kwh_acs: 6, m3_acs: 1.2, importe_calor: 35, importe_frio: 6, importe_variable_acs: 2.5, importe_acs: 18 },
      ]);
      if (url === '/admin/aerotermia/cop') return Promise.resolve([]);
      if (url.includes('/admin/aerotermia/consumos')) return Promise.resolve([]);
      if (url === '/admin/aerotermia/en-vivo') return Promise.resolve(null);
      return Promise.resolve([]);
    });
    render(<MemoryRouter><AdminAerotermiaPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getAllByText('1A').length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('1B').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('100,00 €')).toBeInTheDocument();
    });
  });

  it('filtra vecinos con el buscador', async () => {
    vi.mocked(apiFetch).mockImplementation((url: string) => {
      if (url === '/admin/aerotermia/facturas') return Promise.resolve([
        { id_factura: 'F1', piso: '1A', periodo: recentPeriod(1), importe_total: 100, importe_fijo: 10, kwh_calor: 50, kwh_frio: 10, kwh_acs: 5, m3_acs: 1, importe_calor: 30, importe_frio: 5, importe_variable_acs: 2, importe_acs: 15 },
        { id_factura: 'F1', piso: '1B', periodo: recentPeriod(1), importe_total: 80, importe_fijo: 10, kwh_calor: 40, kwh_frio: 8, kwh_acs: 4, m3_acs: 0.8, importe_calor: 25, importe_frio: 4, importe_variable_acs: 1.5, importe_acs: 12 },
        { id_factura: 'F1', piso: '2A', periodo: recentPeriod(1), importe_total: 90, importe_fijo: 10, kwh_calor: 45, kwh_frio: 9, kwh_acs: 5, m3_acs: 1, importe_calor: 30, importe_frio: 5, importe_variable_acs: 2, importe_acs: 15 },
      ]);
      if (url === '/admin/aerotermia/cop') return Promise.resolve([]);
      if (url.includes('/admin/aerotermia/consumos')) return Promise.resolve([]);
      if (url === '/admin/aerotermia/en-vivo') return Promise.resolve(null);
      return Promise.resolve([]);
    });
    render(<MemoryRouter><AdminAerotermiaPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getAllByText('2A').length).toBeGreaterThanOrEqual(2);
    });
    const input = screen.getByPlaceholderText('Buscar piso...');
    fireEvent.change(input, { target: { value: '2A' } });
    await waitFor(() => {
      // 2A still appears in both grid (1) and pivot table (1)
      expect(screen.getAllByText('2A').length).toBeGreaterThanOrEqual(2);
      // 1A and 1B are gone from the grid, only in pivot table
      expect(screen.getAllByText('1A').length).toBe(1);
      expect(screen.getAllByText('1B').length).toBe(1);
    });
  });
});
