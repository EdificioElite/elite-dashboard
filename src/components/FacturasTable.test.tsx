import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FacturasTable from './FacturasTable';

describe('FacturasTable', () => {
  it('shows empty state when no facturas', () => {
    render(<FacturasTable data={[]} />);
    expect(screen.getByText('No hay facturas disponibles')).toBeInTheDocument();
  });

  it('renders facturas table', () => {
    render(
      <FacturasTable
        data={[
          { id: 1, periodo: '2026-01-01', importe: 80.5, kwh_electrico: 100, kwh_acs: 50 },
          { id: 2, periodo: '2026-02-01', importe: 90.0, kwh_electrico: 110, kwh_acs: 55 },
        ]}
      />
    );
    expect(screen.getByText('80.50 €')).toBeInTheDocument();
    expect(screen.getByText('90.00 €')).toBeInTheDocument();
    expect(screen.getByText('100.00')).toBeInTheDocument();
    expect(screen.getByText('50.00')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(
      <FacturasTable
        data={[{ id: 1, periodo: '2026-01-01', importe: 80.5, kwh_electrico: 100, kwh_acs: 50 }]}
      />
    );
    expect(screen.getByText('Periodo')).toBeInTheDocument();
    expect(screen.getByText('kWh Elec.')).toBeInTheDocument();
    expect(screen.getByText('kWh ACS')).toBeInTheDocument();
    expect(screen.getByText('Importe')).toBeInTheDocument();
  });
});
