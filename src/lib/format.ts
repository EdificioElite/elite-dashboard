export function fmtMoney(value: number): string {
  return value.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' €';
}

export function fmtKwh(value: number, fraction?: number): string {
  const d = fraction ?? (value >= 10 ? 0 : fraction ?? 2);
  return value.toFixed(d) + ' kWh';
}

export function fmtMonth(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
}

export function fmtMonthShort(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleDateString('es-ES', { month: 'short' });
}

export function capitalizar(mes: string): string {
  return mes.charAt(0).toUpperCase() + mes.slice(1);
}

export function greeting(): { saludo: string; hora: string } {
  const h = new Date().getHours();
  if (h < 12) return { saludo: 'Buenos dias', hora: 'manana' };
  if (h < 19) return { saludo: 'Buenas tardes', hora: 'tarde' };
  return { saludo: 'Buenas noches', hora: 'noche' };
}

export function deltaPorcentaje(actual: number, anterior: number): { value: number; label: string; trend: 'up' | 'down' | 'flat' } {
  if (anterior === 0) return { value: 0, label: 'Sin datos', trend: 'flat' };
  const pct = ((actual - anterior) / anterior) * 100;
  return {
    value: Math.abs(pct),
    label: Math.abs(pct).toFixed(0) + '%',
    trend: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat',
  };
}
