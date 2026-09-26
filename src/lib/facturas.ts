export interface FacturaFechas {
  fecha_factura_inicio?: string | null;
  fecha_factura_fin?: string | null;
  periodo?: string | null;
}

export function facturaEnRango(
  f: FacturaFechas,
  desde: string,
  hasta: string
): boolean {
  const desdeT = new Date(desde).getTime();
  const hastaT = new Date(hasta).getTime();

  const enRango = (fecha?: string | null): boolean => {
    if (!fecha) return false;
    const t = new Date(fecha).getTime();
    return !Number.isNaN(t) && t >= desdeT && t <= hastaT;
  };

  return (
    enRango(f.fecha_factura_inicio ?? f.periodo) ||
    enRango(f.fecha_factura_fin)
  );
}
