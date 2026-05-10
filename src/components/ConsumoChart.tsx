import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { apiFetch } from '../api/client';

interface Consumo {
  timestamp: string;
  kwh_calor: number;
  kwh_frio: number;
  m3_acs: number;
  kwh_acs: number;
}

type Preset = '1h' | 'hoy' | '7d' | '30d' | 'año' | 'todo' | null;

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toLocalISO(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

function fromDatetimeLocal(val: string) {
  return val + ':00';
}

function applyPreset(preset: Preset): { desde: string; hasta: string } {
  const now = new Date();
  const start = new Date(now);
  start.setMinutes(0, 0, 0);

  switch (preset) {
    case '1h':
      start.setTime(now.getTime() - 60 * 60 * 1000);
      return { desde: toLocalISO(start), hasta: toLocalISO(now) };
    case 'hoy':
      start.setHours(0, 0, 0, 0);
      now.setHours(23, 59, 0, 0);
      return { desde: toLocalISO(start), hasta: toLocalISO(now) };
    case '7d':
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      now.setHours(23, 59, 0, 0);
      return { desde: toLocalISO(start), hasta: toLocalISO(now) };
    case '30d':
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      now.setHours(23, 59, 0, 0);
      return { desde: toLocalISO(start), hasta: toLocalISO(now) };
    case 'año':
      start.setFullYear(start.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
      now.setHours(23, 59, 0, 0);
      return { desde: toLocalISO(start), hasta: toLocalISO(now) };
    case 'todo':
      return { desde: '2026-01-01T00:00:00', hasta: toLocalISO(now) };
    default:
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      now.setHours(23, 59, 0, 0);
      return { desde: toLocalISO(start), hasta: toLocalISO(now) };
  }
}

function xAxisFormat(iso: string, spanMs: number): string {
  const d = new Date(iso);
  if (spanMs <= 60 * 60 * 1000) {
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }
  if (spanMs <= 24 * 60 * 60 * 1000) {
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }
  if (spanMs <= 7 * 24 * 60 * 60 * 1000) {
    return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
  }
  if (spanMs <= 90 * 24 * 60 * 60 * 1000) {
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }
  return d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
}

function tooltipDate(iso: string, spanMs: number) {
  const d = new Date(iso);
  if (spanMs > 90 * 24 * 60 * 60 * 1000) {
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  return d.toLocaleString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const PRESETS: { key: Preset; label: string }[] = [
  { key: '1h', label: '1h' },
  { key: 'hoy', label: 'Hoy' },
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: 'año', label: 'Año' },
  { key: 'todo', label: 'Todo' },
];

export default function ConsumoChart({ endpoint }: { endpoint?: string }) {
  const [preset, setPreset] = useState<Preset>('7d');
  const [desdeInput, setDesdeInput] = useState('');
  const [hastaInput, setHastaInput] = useState('');
  const [data, setData] = useState<Consumo[]>([]);

  const setRange = useCallback((p: Preset) => {
    setPreset(p);
    if (p) {
      const { desde, hasta } = applyPreset(p);
      setDesdeInput(toDatetimeLocal(desde));
      setHastaInput(toDatetimeLocal(hasta));
    }
  }, []);

  useEffect(() => { setRange('7d'); }, [setRange]);

  const desde = desdeInput ? fromDatetimeLocal(desdeInput) : '';
  const hasta = hastaInput ? fromDatetimeLocal(hastaInput) : '';

  useEffect(() => {
    if (!desde || !hasta) return;
    const base = endpoint || '/consumos';
    const qs = `?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`;
    apiFetch<Consumo[]>(`${base}${qs}`)
      .then(setData)
      .catch(() => setData([]));
  }, [desde, hasta]);

  const spanMs = useMemo(() => {
    if (!desde || !hasta || data.length === 0) return 7 * 24 * 60 * 60 * 1000;
    return new Date(hasta).getTime() - new Date(desde).getTime();
  }, [desde, hasta, data]);

  const formatted = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        label: xAxisFormat(d.timestamp, spanMs),
      })),
    [data, spanMs]
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="mb-4 space-y-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setRange(p.key)}
              className={`px-2.5 py-1 text-xs rounded border ${
                preset === p.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <label className="text-xs">Desde:</label>
          <input
            type="datetime-local"
            value={desdeInput}
            onChange={(e) => { setDesdeInput(e.target.value); setPreset(null); }}
            className="px-2 py-1 border border-gray-300 rounded text-xs"
          />
          <label className="text-xs">Hasta:</label>
          <input
            type="datetime-local"
            value={hastaInput}
            onChange={(e) => { setHastaInput(e.target.value); setPreset(null); }}
            className="px-2 py-1 border border-gray-300 rounded text-xs"
          />
        </div>
      </div>
      {data.length === 0 ? (
        <p className="text-gray-500 text-sm">No hay datos en este rango</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={formatted}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" fontSize={11} />
            <YAxis yAxisId="left" fontSize={12} label={{ value: 'kWh', position: 'insideLeft', angle: -90, style: { fontSize: 11, fill: '#6b7280' } }} />
            <YAxis yAxisId="right" orientation="right" fontSize={12} label={{ value: 'kWh ACS', position: 'insideRight', angle: 90, style: { fontSize: 11, fill: '#f97316' } }} />
            <Tooltip labelFormatter={(_label: string, payload: any[]) => {
              const ts = payload?.[0]?.payload?.timestamp;
              return ts ? tooltipDate(ts, spanMs) : '';
            }} />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="kwh_calor"
              name="Calefaccion"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="kwh_frio"
              name="Refrigeracion"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="kwh_acs"
              name="ACS"
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
            />
        </LineChart>
      </ResponsiveContainer>
      )}
    </div>
  );
}
