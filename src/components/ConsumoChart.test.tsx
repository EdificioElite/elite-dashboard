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
          { timestamp: '2026-01-01T00:00:00Z', kwh_electrico: 1.5, kwh_acs: 0.8 },
          { timestamp: '2026-01-01T01:00:00Z', kwh_electrico: 1.6, kwh_acs: 0.9 },
        ]}
      />
    );
    expect(screen.getByText('Consumo electrico y ACS')).toBeInTheDocument();
  });

  it('renders range selector', () => {
    render(
      <ConsumoChart
        data={[{ timestamp: '2026-01-01T00:00:00Z', kwh_electrico: 1, kwh_acs: 1 }]}
      />
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
