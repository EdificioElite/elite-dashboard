export function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toLocalISO(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

export function fromDatetimeLocal(val: string) {
  return val + ':00';
}

export type Preset = '24h' | '7d' | '30d' | '3m' | '1a';

export function applyPreset(preset: Preset): { desde: string; hasta: string } {
  const now = new Date();
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  switch (preset) {
    case '24h': start.setDate(start.getDate() - 1); return { desde: toLocalISO(start), hasta: toLocalISO(now) };
    case '7d': start.setDate(start.getDate() - 7); start.setHours(0, 0, 0, 0); return { desde: toLocalISO(start), hasta: toLocalISO(now) };
    case '30d': start.setDate(start.getDate() - 30); start.setHours(0, 0, 0, 0); return { desde: toLocalISO(start), hasta: toLocalISO(now) };
    case '3m': start.setMonth(start.getMonth() - 3); start.setHours(0, 0, 0, 0); return { desde: toLocalISO(start), hasta: toLocalISO(now) };
    case '1a': start.setFullYear(start.getFullYear() - 1); start.setHours(0, 0, 0, 0); return { desde: toLocalISO(start), hasta: toLocalISO(now) };
    default: start.setDate(start.getDate() - 7); start.setHours(0, 0, 0, 0); return { desde: toLocalISO(start), hasta: toLocalISO(now) };
  }
}
