import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FacturaSelector from '../components/FacturaSelector';

const mockFacturas = [
  { id_factura: '1A-2026-03', piso: '1A', periodo: '2026-03-01', kwh_calor: 100, kwh_frio: 20, kwh_acs: 30, m3_acs: 1.5, importe_total: 80, fecha_factura_inicio: '2026-03-01', fecha_factura_fin: '2026-03-31' },
  { id_factura: '2A-2026-03', piso: '2A', periodo: '2026-03-01', kwh_calor: 80, kwh_frio: 15, kwh_acs: 25, m3_acs: 1.2, importe_total: 60, fecha_factura_inicio: '2026-03-01', fecha_factura_fin: '2026-03-31' },
  { id_factura: '1A-2026-04', piso: '1A', periodo: '2026-04-01', kwh_calor: 90, kwh_frio: 10, kwh_acs: 20, m3_acs: 1.0, importe_total: 70, fecha_factura_inicio: '2026-04-01', fecha_factura_fin: '2026-04-30' },
];

describe('FacturaSelector', () => {
  it('renders select dropdown', () => {
    render(<FacturaSelector facturas={mockFacturas} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('shows default option', () => {
    render(<FacturaSelector facturas={mockFacturas} />);
    expect(screen.getByText('Seleccionar periodo...')).toBeInTheDocument();
  });

  it('shows empty state when no facturas', () => {
    render(<FacturaSelector facturas={[]} />);
    expect(screen.getByText('No hay facturas disponibles')).toBeInTheDocument();
  });

  it('shows unique periodos (deduplicated by fecha_inicio)', () => {
    render(<FacturaSelector facturas={mockFacturas} />);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3); // default + 2 unique periods
  });
});
