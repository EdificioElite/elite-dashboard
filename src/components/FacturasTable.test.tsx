import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FacturasTable from './FacturasTable';

describe('FacturasTable', () => {
  it('shows empty state when no facturas', () => {
    render(<FacturasTable data={[]} />);
    expect(screen.getByText('No hay facturas disponibles')).toBeInTheDocument();
  });

  it('renders facturas with transposed layout', () => {
    render(
      <FacturasTable
        data={[
          { id_factura: '1', periodo: '2026-01-01', importe_total: 80.5, importe_fijo: 20, kwh_calor: 100, kwh_frio: 30, kwh_acs: 50, m3_acs: 2.5, importe_calor: 40, importe_frio: 10, importe_variable_acs: 15, importe_acs: 30.5 },
          { id_factura: '2', periodo: '2026-02-01', importe_total: 90.0, importe_fijo: 20, kwh_calor: 110, kwh_frio: 25, kwh_acs: 55, m3_acs: 2.8, importe_calor: 45, importe_frio: 8, importe_variable_acs: 18, importe_acs: 37.0 },
        ]}
      />
    );
    expect(screen.getByText('kWh calor')).toBeInTheDocument();
    expect(screen.getByText('kWh frio')).toBeInTheDocument();
    expect(screen.getByText('kWh ACS')).toBeInTheDocument();
    expect(screen.getByText('m³ ACS')).toBeInTheDocument();
    expect(screen.getByText('Fijo')).toBeInTheDocument();
    expect(screen.getByText('Calefaccion')).toBeInTheDocument();
    expect(screen.getByText('Refrigeracion')).toBeInTheDocument();
    expect(screen.getByText('ACS variable')).toBeInTheDocument();
    expect(screen.getByText('ACS agua')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Consumos')).toBeInTheDocument();
    expect(screen.getByText('Importes')).toBeInTheDocument();
  });

  it('renders data values correctly', () => {
    render(
      <FacturasTable
        data={[{ id_factura: '1', periodo: '2026-01-01', importe_total: 80.5, importe_fijo: 20, kwh_calor: 100, kwh_frio: 30, kwh_acs: 50, m3_acs: 2.5, importe_calor: 40, importe_frio: 10, importe_variable_acs: 15, importe_acs: 30.5 }]}
      />
    );
    expect(screen.getByText('100 kWh')).toBeInTheDocument();
    expect(screen.getByText('50 kWh')).toBeInTheDocument();
    expect(screen.getByText('2,5 m³')).toBeInTheDocument();
    expect(screen.getByText('80,50 €')).toBeInTheDocument();
    expect(screen.getByText('20,00 €')).toBeInTheDocument();
  });
});
