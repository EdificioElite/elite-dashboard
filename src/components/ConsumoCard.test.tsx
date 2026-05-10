import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConsumoCard from './ConsumoCard';

describe('ConsumoCard', () => {
  it('shows empty state when data is null', () => {
    render(<ConsumoCard data={null} />);
    expect(screen.getByText('No hay datos de consumo disponibles')).toBeInTheDocument();
  });

  it('displays calefaccion, refrigeracion and ACS values', () => {
    render(
      <ConsumoCard
        data={{ timestamp: '2026-01-01T12:00:00Z', kwh_calor: 12.34, kwh_frio: 3.21, m3_acs: 0.12, kwh_acs: 5.67, temp_impulsion: 42, temp_retorno: 32 }}
      />
    );
    expect(screen.getByText('12.34')).toBeInTheDocument();
    expect(screen.getByText('3.21')).toBeInTheDocument();
    expect(screen.getByText('5.67')).toBeInTheDocument();
    expect(screen.getByText('Calefaccion')).toBeInTheDocument();
    expect(screen.getByText('Refrigeracion')).toBeInTheDocument();
    expect(screen.getByText('ACS (Agua Caliente)')).toBeInTheDocument();
  });

  it('displays timestamp', () => {
    render(
      <ConsumoCard
        data={{ timestamp: '2026-05-09T10:30:00Z', kwh_calor: 1, kwh_frio: 0, m3_acs: 0.01, kwh_acs: 2, temp_impulsion: null, temp_retorno: null }}
      />
    );
    expect(screen.getByText(/Actualizado:/)).toBeInTheDocument();
  });
});
