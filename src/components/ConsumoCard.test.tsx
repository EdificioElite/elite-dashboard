import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConsumoCard from './ConsumoCard';

describe('ConsumoCard', () => {
  it('shows empty state when data is null', () => {
    render(<ConsumoCard data={null} />);
    expect(screen.getByText('No hay datos de consumo disponibles')).toBeInTheDocument();
  });

  it('displays electricidad and ACS values', () => {
    render(
      <ConsumoCard
        data={{ timestamp: '2026-01-01T12:00:00Z', kwh_electrico: 12.34, kwh_acs: 5.67 }}
      />
    );
    expect(screen.getByText('12.34')).toBeInTheDocument();
    expect(screen.getByText('5.67')).toBeInTheDocument();
    expect(screen.getByText('Electricidad')).toBeInTheDocument();
    expect(screen.getByText('ACS (Agua Caliente)')).toBeInTheDocument();
  });

  it('displays timestamp', () => {
    render(
      <ConsumoCard
        data={{ timestamp: '2026-05-09T10:30:00Z', kwh_electrico: 1, kwh_acs: 2 }}
      />
    );
    expect(screen.getByText(/Actualizado:/)).toBeInTheDocument();
  });
});
