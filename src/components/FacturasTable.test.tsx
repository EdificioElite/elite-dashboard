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
          { id_factura: '1', periodo: '2026-01-01', importe_total: 80.5, importe_fijo: 20, kwh_calor: 100, kwh_frio: 30, kwh_acs: 50, m3_acs: 2.5, importe_calor: 40, importe_frio: 10, importe_variable_acs: 15, importe_acs: 30.5 },
          { id_factura: '2', periodo: '2026-02-01', importe_total: 90.0, importe_fijo: 20, kwh_calor: 110, kwh_frio: 25, kwh_acs: 55, m3_acs: 2.8, importe_calor: 45, importe_frio: 8, importe_variable_acs: 18, importe_acs: 37.0 },
        ]}
      />
    );
    expect(screen.getByText('80,50 €')).toBeInTheDocument();
    expect(screen.getByText('90,00 €')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(
      <FacturasTable
        data={[{ id_factura: '1', periodo: '2026-01-01', importe_total: 80.5, importe_fijo: 20, kwh_calor: 100, kwh_frio: 30, kwh_acs: 50, m3_acs: 2.5, importe_calor: 40, importe_frio: 10, importe_variable_acs: 15, importe_acs: 30.5 }]}
      />
    );
    expect(screen.getByText('Periodo')).toBeInTheDocument();
    expect(screen.getByText('Calefacción')).toBeInTheDocument();
    expect(screen.getByText('Refrigeración')).toBeInTheDocument();
    expect(screen.getByText('ACS')).toBeInTheDocument();
    expect(screen.getByText('m³ ACS')).toBeInTheDocument();
    expect(screen.getByText('Importe')).toBeInTheDocument();
  });
});
