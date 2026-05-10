import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConsumoChart from './ConsumoChart';

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...(actual as any),
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

describe('ConsumoChart', () => {
  it('shows empty state when no data', () => {
    render(<ConsumoChart data={[]} />);
    expect(screen.getByText('No hay datos para mostrar')).toBeInTheDocument();
  });

  it('renders chart with data', () => {
    render(
      <ConsumoChart
        data={[
          { timestamp: '2026-01-01T00:00:00Z', kwh_calor: 1.5, kwh_frio: 0.3, m3_acs: 0.02, kwh_acs: 0.93 },
          { timestamp: '2026-01-01T01:00:00Z', kwh_calor: 1.6, kwh_frio: 0.2, m3_acs: 0.01, kwh_acs: 0.465 },
        ]}
      />
    );
    expect(screen.getByText('Consumo termico y ACS')).toBeInTheDocument();
  });

  it('renders range selector', () => {
    render(
      <ConsumoChart
        data={[{ timestamp: '2026-01-01T00:00:00Z', kwh_calor: 1, kwh_frio: 0, m3_acs: 0, kwh_acs: 0 }]}
      />
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
