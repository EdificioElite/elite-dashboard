import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PieChartCard from './PieChartCard';

const mockData = [
  { piso: '1A', kwh_total: 500, porcentaje: 40, importe: 120 },
  { piso: '2A', kwh_total: 400, porcentaje: 32, importe: 96 },
  { piso: '3A', kwh_total: 350, porcentaje: 28, importe: 84 },
];

describe('PieChartCard', () => {
  it('shows empty state when no data', () => {
    render(<PieChartCard data={[]} />);
    expect(screen.getByText('No hay datos en este periodo')).toBeInTheDocument();
  });

  it('renders title', () => {
    render(<PieChartCard data={mockData} />);
    expect(screen.getByText('Distribución por vecino')).toBeInTheDocument();
  });

  it('renders vecino names in legend', () => {
    render(<PieChartCard data={mockData} />);
    expect(screen.getByText(/1A/)).toBeInTheDocument();
    expect(screen.getByText(/2A/)).toBeInTheDocument();
    expect(screen.getByText(/3A/)).toBeInTheDocument();
  });
});
