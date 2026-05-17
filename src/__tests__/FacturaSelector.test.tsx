import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FacturaSelector from '../components/FacturaSelector';

const mockFacturas = [
  { id_factura: 'FAC-001', periodo: '2026-03-01' },
  { id_factura: 'FAC-002', periodo: '2026-04-01' },
];

describe('FacturaSelector', () => {
  it('renders select dropdown', () => {
    render(<FacturaSelector facturas={mockFacturas} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('shows default option', () => {
    render(<FacturaSelector facturas={mockFacturas} />);
    expect(screen.getByText('Seleccionar factura...')).toBeInTheDocument();
  });

  it('shows empty state when no facturas', () => {
    render(<FacturaSelector facturas={[]} />);
    expect(screen.getByText('No hay facturas disponibles')).toBeInTheDocument();
  });
});
