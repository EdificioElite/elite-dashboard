import { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { apiFetch } from '../api/client';
import SegmentedControl from './SegmentedControl';

interface Consumo {
  timestamp: string;
  kwh_calor: number;
  kwh_frio: number;
  m3_acs: number;
  kwh_acs: number;
}

type Preset = '24h' | '7d' | '30d' | '1a' | null;

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
    case '24h': start.setDate(start.getDate() - 1); return { desde: toLocalISO(start), hasta: toLocalISO(now) };
    case '7d': start.setDate(start.getDate() - 7); start.setHours(0, 0, 0, 0); return { desde: toLocalISO(start), hasta: toLocalISO(now) };
    case '30d': start.setDate(start.getDate() - 30); start.setHours(0, 0, 0, 0); return { desde: toLocalISO(start), hasta: toLocalISO(now) };
    case '1a': start.setFullYear(start.getFullYear() - 1); start.setHours(0, 0, 0, 0); return { desde: toLocalISO(start), hasta: toLocalISO(now) };
    default: start.setDate(start.getDate() - 7); start.setHours(0, 0, 0, 0); return { desde: toLocalISO(start), hasta: toLocalISO(now) };
  }
}

function xAxisFormat(iso: string, spanMs: number): string {
  const d = new Date(iso);
  if (spanMs <= 24 * 60 * 60 * 1000) return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  if (spanMs <= 7 * 24 * 60 * 60 * 1000) return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
  if (spanMs <= 90 * 24 * 60 * 60 * 1000) return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  return d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
}

const PRESETS = [
  { key: '24h', label: '24h' },
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '1a', label: '1 ano' },
];

const TOOLTIP_STYLE = {
  background: 'rgba(58,47,36,.92)',
  border: 'none',
  borderRadius: '10px',
  color: '#f5ecdc',
  fontSize: '11.5px',
  fontFamily: "'Manrope', sans-serif",
  padding: '10px 12px',
  boxShadow: '0 4px 16px rgba(0,0,0,.15)',
};

function computeDomain(values: number[]): [number, number] {
  const filtered = values.filter((v) => v != null && !isNaN(v));
  if (filtered.length === 0) return [0, 1];
  const min = Math.min(...filtered);
  const max = Math.max(...filtered);
  const range = max - min;
  const padding = Math.max(range * 0.15, 0.01);
  return [Math.max(0, min - padding), max + padding];
}

interface ChartLineProps {
  data: { label: string; value: number; timestamp: string }[];
  color: string;
  unit: string;
  dashed?: boolean;
  decimals?: number;
}

function ChartLine({ data, color, unit, dashed, decimals = 2 }: ChartLineProps) {
  const domain = useMemo(() => computeDomain(data.map((d) => d.value)), [data]);

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="rgba(58,47,36,.06)" vertical={false} />
        <XAxis dataKey="label" fontSize={10} tick={{ fill: 'rgba(58,47,36,.35)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis
          fontSize={10}
          tick={{ fill: 'rgba(58,47,36,.35)', fontFamily: "'JetBrains Mono', monospace" }}
          axisLine={false} tickLine={false}
          domain={domain}
          width={40}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value: number) => [`${Number(value).toFixed(decimals)} ${unit}`, '']}
          labelFormatter={(label: string) => {
            const item = data.find((d) => d.label === label);
            return item?.timestamp ? new Date(item.timestamp).toLocaleString('es-ES', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : label;
          }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          strokeDasharray={dashed ? '4 3' : undefined}
          dot={false}
          activeDot={{ r: 4, fill: '#fff8ee', stroke: color, strokeWidth: 1.5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function HistoricoCharts({ endpoint, title }: { endpoint?: string; title?: string }) {
  const [preset, setPreset] = useState<Preset>('7d');
  const [desdeInput, setDesdeInput] = useState('');
  const [hastaInput, setHastaInput] = useState('');
  const [data, setData] = useState<Consumo[]>([]);

  const setRange = (p: string) => {
    setPreset(p as Preset);
    if (p) {
      const { desde, hasta } = applyPreset(p as Preset);
      setDesdeInput(toDatetimeLocal(desde));
      setHastaInput(toDatetimeLocal(hasta));
    }
  };

  useEffect(() => { setRange('7d'); }, []);

  const desde = desdeInput ? fromDatetimeLocal(desdeInput) : '';
  const hasta = hastaInput ? fromDatetimeLocal(hastaInput) : '';

  useEffect(() => {
    if (!desde || !hasta) return;
    const base = endpoint || '/consumos';
    const qs = `?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`;
    apiFetch<Consumo[]>(`${base}${qs}`)
      .then(setData)
      .catch(() => setData([]));
  }, [desde, hasta, endpoint]);

  const spanMs = useMemo(() => {
    if (!desde || !hasta || data.length === 0) return 7 * 24 * 60 * 60 * 1000;
    return new Date(hasta).getTime() - new Date(desde).getTime();
  }, [desde, hasta, data]);

  const formatted = useMemo(
    () => data.map((d) => ({ timestamp: d.timestamp, label: xAxisFormat(d.timestamp, spanMs) })),
    [data, spanMs]
  );

  const calorData = useMemo(
    () => data.map((d, i) => ({ ...formatted[i], value: d.kwh_calor })),
    [data, formatted]
  );
  const frioData = useMemo(
    () => data.map((d, i) => ({ ...formatted[i], value: d.kwh_frio })),
    [data, formatted]
  );
  const acsData = useMemo(
    () => data.map((d, i) => ({ ...formatted[i], value: d.m3_acs })),
    [data, formatted]
  );

  return (
    <div className="glass p-[26px]">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff8ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
            </svg>
          </div>
          <span className="eyebrow">{title || 'Historico'}</span>
        </div>
        <SegmentedControl options={PRESETS} value={preset ?? ''} onChange={(k) => setRange(k)} />
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <label className="text-[11px] font-medium uppercase tracking-wider text-cocoa/40">Desde:</label>
        <input type="datetime-local" value={desdeInput} onChange={(e) => { setDesdeInput(e.target.value); setPreset(null); }} className="input-card text-xs py-1.5 px-3 w-auto" />
        <label className="text-[11px] font-medium uppercase tracking-wider text-cocoa/40">Hasta:</label>
        <input type="datetime-local" value={hastaInput} onChange={(e) => { setHastaInput(e.target.value); setPreset(null); }} className="input-card text-xs py-1.5 px-3 w-auto" />
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-cocoa/44 py-8">No hay datos en este periodo</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div id="calor">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--calor)' }} />
              <span className="text-[11px] font-medium text-cocoa/40 uppercase tracking-wider">Calor</span>
              <span className="text-[10px] text-cocoa/30 font-mono">kWh</span>
            </div>
            <ChartLine data={calorData} color="#c0392b" unit="kWh" />
          </div>
          <div id="frio">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--frio)' }} />
              <span className="text-[11px] font-medium text-cocoa/40 uppercase tracking-wider">Frio</span>
              <span className="text-[10px] text-cocoa/30 font-mono">kWh</span>
            </div>
            <ChartLine data={frioData} color="#5b8ba0" unit="kWh" />
          </div>
          <div id="acs">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--sage)' }} />
              <span className="text-[11px] font-medium text-cocoa/40 uppercase tracking-wider">ACS</span>
              <span className="text-[10px] text-cocoa/30 font-mono">m³</span>
            </div>
            <ChartLine data={acsData} color="#6f8a5c" unit="m³" dashed decimals={3} />
          </div>
        </div>
      )}
    </div>
  );
}
