import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConsumoVecinosChart from '../components/ConsumoVecinosChart';

const mockData = [
  { piso: '1A', kwh_calor: 200, kwh_frio: 50, m3_acs: 3.5, kwh_acs: 162.75 },
  { piso: '2A', kwh_calor: 150, kwh_frio: 40, m3_acs: 2.8, kwh_acs: 130.2 },
];

describe('ConsumoVecinosChart', () => {
  it('shows empty state when no data', () => {
    render(<ConsumoVecinosChart data={[]} />);
    expect(screen.getByText('No hay datos en este periodo')).toBeInTheDocument();
  });

  it('renders title', () => {
    render(<ConsumoVecinosChart data={mockData} />);
    expect(screen.getByText('Consumo por vecino')).toBeInTheDocument();
  });

  it('renders legend items', () => {
    render(<ConsumoVecinosChart data={mockData} />);
    expect(screen.getByText('Calefacción')).toBeInTheDocument();
    expect(screen.getByText('Refrigeración')).toBeInTheDocument();
    expect(screen.getByText('ACS')).toBeInTheDocument();
  });
});
