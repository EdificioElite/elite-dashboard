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
          kwh_calor_abs: 123456, kwh_frio_abs: 61728, m3_acs_abs: 12.345,
          kwh_calor_mes_inicio: 9.13, kwh_frio_mes_inicio: 2.76, m3_acs_mes_inicio: 0.117,
          temp_impulsion: 42, temp_retorno: 32, power_w: 150, modo: 'calefaccion',
        }}
      />
    );
    expect(screen.getByText('123.456')).toBeInTheDocument();
    expect(screen.getByText('61.728')).toBeInTheDocument();
    expect(screen.getByText('12,35')).toBeInTheDocument();
    expect(screen.getByText('Calefacción')).toBeInTheDocument();
    expect(screen.getByText('Refrigeración')).toBeInTheDocument();
    expect(screen.getByText('ACS')).toBeInTheDocument();
    expect(screen.getByText('Estado')).toBeInTheDocument();
    expect(screen.getByText('+9 desde inicio de mes')).toBeInTheDocument();
    expect(screen.getByText('+3 desde inicio de mes')).toBeInTheDocument();
    expect(screen.getByText('+0,1 desde inicio de mes')).toBeInTheDocument();
    expect(screen.getByText('150 W')).toBeInTheDocument();
    expect(screen.getByText('42.0°C')).toBeInTheDocument();
    expect(screen.getByText('32.0°C')).toBeInTheDocument();
    expect(screen.getByText('Contadores de Aerotermia en vivo')).toBeInTheDocument();
    expect(screen.getByText('Calefaccion')).toBeInTheDocument();
  });

  it('hides delta when mes_inicio is null', () => {
    render(
      <ConsumoCard
        data={{
          timestamp: '2026-05-09T10:30:00Z', kwh_calor: 5, kwh_frio: 0, m3_acs: 0.01, kwh_acs: 2,
          kwh_calor_abs: 5, kwh_frio_abs: 0, m3_acs_abs: 0.01,
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
          kwh_calor_abs: 1, kwh_frio_abs: 0, m3_acs_abs: 0.01,
          kwh_calor_mes_inicio: null, kwh_frio_mes_inicio: null, m3_acs_mes_inicio: null,
          temp_impulsion: null, temp_retorno: null, power_w: null,
        }}
      />
    );
    expect(screen.getByText('Apagado')).toBeInTheDocument();
  });

  it('displays Refrigeracion mode in azul', () => {
    render(
      <ConsumoCard
        data={{
          timestamp: '2026-01-01T12:00:00Z',
          kwh_calor: 1, kwh_frio: 5, m3_acs: 0.01, kwh_acs: 2,
          kwh_calor_abs: 1, kwh_frio_abs: 5, m3_acs_abs: 0.01,
          kwh_calor_mes_inicio: null, kwh_frio_mes_inicio: null, m3_acs_mes_inicio: null,
          temp_impulsion: 7, temp_retorno: 12, power_w: 2000,
          modo: 'refrigeracion',
        }}
      />
    );
    expect(screen.getByText('Refrigeracion')).toBeInTheDocument();
  });

  it('displays Desconocido mode in gris', () => {
    render(
      <ConsumoCard
        data={{
          timestamp: '2026-01-01T12:00:00Z',
          kwh_calor: 1, kwh_frio: 0, m3_acs: 0.01, kwh_acs: 2,
          kwh_calor_abs: 1, kwh_frio_abs: 0, m3_acs_abs: 0.01,
          kwh_calor_mes_inicio: null, kwh_frio_mes_inicio: null, m3_acs_mes_inicio: null,
          temp_impulsion: 25, temp_retorno: 20, power_w: 100,
          modo: 'desconocido',
        }}
      />
    );
    expect(screen.getByText('Desconocido')).toBeInTheDocument();
  });

  it('does not show mode label when modo is absent', () => {
    render(
      <ConsumoCard
        data={{
          timestamp: '2026-01-01T12:00:00Z',
          kwh_calor: 1, kwh_frio: 0, m3_acs: 0.01, kwh_acs: 2,
          kwh_calor_abs: 1, kwh_frio_abs: 0, m3_acs_abs: 0.01,
          kwh_calor_mes_inicio: null, kwh_frio_mes_inicio: null, m3_acs_mes_inicio: null,
          temp_impulsion: null, temp_retorno: null, power_w: null,
        }}
      />
    );
    expect(screen.queryByText('Calefaccion')).not.toBeInTheDocument();
    expect(screen.queryByText('Refrigeracion')).not.toBeInTheDocument();
    expect(screen.queryByText('Desconocido')).not.toBeInTheDocument();
    expect(screen.getByText('Apagado')).toBeInTheDocument();
  });
});
