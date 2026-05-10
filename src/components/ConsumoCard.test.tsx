import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConsumoCard from './ConsumoCard';

describe('ConsumoCard', () => {
  it('shows empty state when data is null', () => {
    render(<ConsumoCard data={null} />);
    expect(screen.getByText('Esperando datos del contador...')).toBeInTheDocument();
  });

  it('displays calor, frio, ACS and Estado columns', () => {
    render(
      <ConsumoCard
        data={{
          timestamp: '2026-01-01T12:00:00Z',
          kwh_calor: 12.34, kwh_frio: 3.21, m3_acs: 0.12, kwh_acs: 5.67,
          kwh_calor_mes_inicio: 9.13, kwh_frio_mes_inicio: 2.76, m3_acs_mes_inicio: 0.117,
          temp_impulsion: 42, temp_retorno: 32, power_w: 150,
        }}
      />
    );
    expect(screen.getByText('12.34')).toBeInTheDocument();
    expect(screen.getByText('3.21')).toBeInTheDocument();
    expect(screen.getByText('0.120')).toBeInTheDocument();
    expect(screen.getByText('Calor')).toBeInTheDocument();
    expect(screen.getByText('Frio')).toBeInTheDocument();
    expect(screen.getByText('ACS')).toBeInTheDocument();
    expect(screen.getByText('Estado')).toBeInTheDocument();
    expect(screen.getByText('+9.13 desde inicio de mes')).toBeInTheDocument();
    expect(screen.getByText('+2.76 desde inicio de mes')).toBeInTheDocument();
    expect(screen.getByText('+0.117 desde inicio de mes')).toBeInTheDocument();
    expect(screen.getByText('150 W')).toBeInTheDocument();
    expect(screen.getByText('42.0°C')).toBeInTheDocument();
    expect(screen.getByText('32.0°C')).toBeInTheDocument();
    expect(screen.getByText('En vivo')).toBeInTheDocument();
  });

  it('hides delta when mes_inicio is null', () => {
    render(
      <ConsumoCard
        data={{
          timestamp: '2026-05-09T10:30:00Z', kwh_calor: 5, kwh_frio: 0, m3_acs: 0.01, kwh_acs: 2,
          kwh_calor_mes_inicio: null, kwh_frio_mes_inicio: null, m3_acs_mes_inicio: null,
          temp_impulsion: null, temp_retorno: null, power_w: null,
        }}
      />
    );
    expect(screen.queryByText(/desde inicio de mes/)).not.toBeInTheDocument();
  });

  it('shows apagado when power is null or zero', () => {
    render(
      <ConsumoCard
        data={{
          timestamp: '2026-05-09T10:30:00Z', kwh_calor: 1, kwh_frio: 0, m3_acs: 0.01, kwh_acs: 2,
          kwh_calor_mes_inicio: null, kwh_frio_mes_inicio: null, m3_acs_mes_inicio: null,
          temp_impulsion: null, temp_retorno: null, power_w: null,
        }}
      />
    );
    expect(screen.getByText('Apagado')).toBeInTheDocument();
  });
});
