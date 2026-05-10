import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConsumoChart from './ConsumoChart';

vi.mock('../api/client', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...(actual as any),
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

import { apiFetch } from '../api/client';
const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

describe('ConsumoChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockResolvedValue([]);
  });

  it('shows empty state when no data in range', async () => {
    render(<ConsumoChart />);
    await waitFor(() => {
      expect(screen.getByText('No hay datos en este rango')).toBeInTheDocument();
    });
  });

  it('renders chart when API returns data', async () => {
    mockApiFetch.mockResolvedValue([
      { timestamp: '2026-01-01T00:00:00Z', kwh_calor: 1.5, kwh_frio: 0.3, m3_acs: 0.02, kwh_acs: 0.93 },
      { timestamp: '2026-01-01T12:00:00Z', kwh_calor: 1.6, kwh_frio: 0.2, m3_acs: 0.01, kwh_acs: 0.465 },
    ]);

    render(<ConsumoChart />);

    await waitFor(() => {
      expect(screen.queryByText('No hay datos en este rango')).not.toBeInTheDocument();
    });
  });

  it('renders all preset buttons', () => {
    render(<ConsumoChart />);
    expect(screen.getByText('1h')).toBeInTheDocument();
    expect(screen.getByText('Hoy')).toBeInTheDocument();
    expect(screen.getByText('7d')).toBeInTheDocument();
    expect(screen.getByText('30d')).toBeInTheDocument();
    expect(screen.getByText('Año')).toBeInTheDocument();
    expect(screen.getByText('Todo')).toBeInTheDocument();
  });

  it('renders date inputs with default 7d range', () => {
    render(<ConsumoChart />);
    const inputs = screen.getAllByDisplayValue(/2026/);
    expect(inputs).toHaveLength(2);
  });

  it('7d preset is selected by default', () => {
    render(<ConsumoChart />);
    const btn7d = screen.getByText('7d');
    expect(btn7d.className).toContain('bg-blue-600');
  });

  it('changes preset on click and refetches', async () => {
    render(<ConsumoChart />);
    const btn1h = screen.getByText('1h');
    await userEvent.click(btn1h);
    expect(btn1h.className).toContain('bg-blue-600');
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(2);
    });
  });

  it('clears preset when date input changes', async () => {
    render(<ConsumoChart />);
    const inputs = screen.getAllByDisplayValue(/2026/);
    await userEvent.clear(inputs[0]);
    await userEvent.type(inputs[0], '2026-01-01T00:00');
    await waitFor(() => {
      const btn7d = screen.getByText('7d');
      expect(btn7d.className).not.toContain('bg-blue-600');
    });
  });

  it('requests correct endpoint for admin view', async () => {
    render(<ConsumoChart endpoint="/admin/vecinos/2A" />);
    await waitFor(() => {
      const call = mockApiFetch.mock.calls[0][0] as string;
      expect(call).toContain('/admin/vecinos/2A');
    });
  });
});
