import { describe, it, expect } from 'vitest';
import { facturaEnRango } from '../lib/facturas';

describe('facturaEnRango', () => {
  const desde = '2026-03-01T00:00:00';
  const hasta = '2026-03-31T23:59:59';

  it('devuelve true si fecha_factura_inicio cae dentro del rango', () => {
    expect(facturaEnRango({ fecha_factura_inicio: '2026-03-15T00:00:00' }, desde, hasta)).toBe(true);
  });

  it('devuelve true si fecha_factura_fin cae dentro del rango', () => {
    expect(facturaEnRango({ fecha_factura_fin: '2026-03-15T00:00:00' }, desde, hasta)).toBe(true);
  });

  it('devuelve true si al menos una de las dos fechas cae dentro del rango', () => {
    expect(
      facturaEnRango(
        {
          fecha_factura_inicio: '2026-02-10T00:00:00',
          fecha_factura_fin: '2026-03-20T00:00:00',
        },
        desde,
        hasta
      )
    ).toBe(true);
  });

  it('devuelve false si ninguna de las dos fechas cae dentro del rango', () => {
    expect(
      facturaEnRango(
        {
          fecha_factura_inicio: '2026-01-05T00:00:00',
          fecha_factura_fin: '2026-02-01T00:00:00',
        },
        desde,
        hasta
      )
    ).toBe(false);
  });

  it('ignora fechas nulas o indefinidas', () => {
    expect(
      facturaEnRango({ fecha_factura_inicio: '2026-03-15T00:00:00', fecha_factura_fin: null }, desde, hasta)
    ).toBe(true);
    expect(facturaEnRango({}, desde, hasta)).toBe(false);
  });

  it('usa periodo como respaldo de fecha_factura_inicio', () => {
    expect(facturaEnRango({ periodo: '2026-03-15T00:00:00' }, desde, hasta)).toBe(true);
    expect(facturaEnRango({ periodo: '2026-01-15T00:00:00' }, desde, hasta)).toBe(false);
  });
});
