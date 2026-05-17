import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HeatmapChart from '../components/HeatmapChart';

const mockData = [
  { piso: '1A', periodo: '2026-01', kwh_calor: 200, kwh_frio: 10, kwh_acs: 50, m3_acs: 2 },
  { piso: '1A', periodo: '2026-02', kwh_calor: 180, kwh_frio: 15, kwh_acs: 45, m3_acs: 1.8 },
  { piso: '2A', periodo: '2026-01', kwh_calor: 150, kwh_frio: 8, kwh_acs: 40, m3_acs: 1.5 },
  { piso: '2A', periodo: '2026-02', kwh_calor: 140, kwh_frio: 12, kwh_acs: 38, m3_acs: 1.4 },
];

describe('HeatmapChart', () => {
  it('shows empty state when no data', () => {
    render(<HeatmapChart data={[]} />);
    expect(screen.getByText('No hay datos disponibles')).toBeInTheDocument();
  });

  it('renders title', () => {
    render(<HeatmapChart data={mockData} />);
    expect(screen.getByText('Heatmap mensual')).toBeInTheDocument();
  });

  it('renders piso labels', () => {
    render(<HeatmapChart data={mockData} />);
    expect(screen.getByText('1A')).toBeInTheDocument();
    expect(screen.getByText('2A')).toBeInTheDocument();
  });
});
