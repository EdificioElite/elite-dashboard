import { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area,
} from 'recharts';
import { apiFetch } from '../api/client';
import SegmentedControl from './SegmentedControl';
import ChartTooltip from './ChartTooltip';
import Icon from './Icon';

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
  if (spanMs <= 26 * 60 * 60 * 1000) return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  if (spanMs <= 7 * 24 * 60 * 60 * 1000) return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
  if (spanMs <= 90 * 24 * 60 * 60 * 1000) return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  return d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
}

const PRESETS = [
  { key: '24h', label: '24h' },
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '1a', label: '1 año' },
];

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

function ChartLine({ data, color, dashed }: ChartLineProps) {
  const domain = useMemo(() => computeDomain(data.map((d) => d.value)), [data]);

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="rgba(30,20,10,0.12)" vertical={false} />
        <XAxis dataKey="label" fontSize={10} tick={{ fill: 'rgba(58,47,36,.35)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis
          fontSize={10}
          tick={{ fill: 'rgba(58,47,36,.35)', fontFamily: "'JetBrains Mono', monospace" }}
          axisLine={false} tickLine={false}
          domain={domain}
          width={40}
        />
        <Tooltip content={<ChartTooltip labelFormatter={(_label: string, payload: any) => {
          const entry = payload?.[0]?.payload as { timestamp?: string } | undefined;
          return entry?.timestamp ? new Date(entry.timestamp).toLocaleString('es-ES', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : _label;
        }} />} />
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.12} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="value" stroke="none" fill="url(#areaGradient)" />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={3}
          strokeDasharray={dashed ? '4 3' : undefined}
          dot={false}
          activeDot={{ r: 4, fill: '#fff8ee', stroke: color, strokeWidth: 1.5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function HistoricoCharts({ endpoint, title, desde: extDesde, hasta: extHasta }: { endpoint?: string; title?: string; desde?: string; hasta?: string }) {
  const external = extDesde && extHasta;
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

  useEffect(() => { if (!external) setRange('7d'); }, [external]);

  const desde = external ? extDesde! : (desdeInput ? fromDatetimeLocal(desdeInput) : '');
  const hasta = external ? extHasta! : (hastaInput ? fromDatetimeLocal(hastaInput) : '');

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
    <div className="glass p-[26px]" aria-label="Gráfica de consumo histórico de calor, frío y ACS">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
            <Icon name="chart" size={14} className="text-cream" />
          </div>
          <span className="eyebrow">{title || 'Histórico'}</span>
        </div>
        {!external && <SegmentedControl options={PRESETS} value={preset ?? ''} onChange={(k) => setRange(k)} />}
      </div>

      {!external && (
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-medium uppercase tracking-wider text-cocoa/40 shrink-0">Desde:</label>
          <input type="datetime-local" value={desdeInput} onChange={(e) => { setDesdeInput(e.target.value); setPreset(null); }} className="input-card text-xs py-1.5 px-3 w-full sm:w-auto" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-medium uppercase tracking-wider text-cocoa/40 shrink-0">Hasta:</label>
          <input type="datetime-local" value={hastaInput} onChange={(e) => { setHastaInput(e.target.value); setPreset(null); }} className="input-card text-xs py-1.5 px-3 w-full sm:w-auto" />
        </div>
      </div>
      )}

      {data.length === 0 ? (
        <p className="text-sm text-cocoa/44 py-8">No hay datos en este periodo</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div id="calor" className="scroll-mt-20">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--calor)' }} />
              <span className="text-[11px] font-medium text-cocoa/40 uppercase tracking-wider">Calefacción</span>
              <span className="text-[10px] text-cocoa/30 font-mono">kWh</span>
            </div>
            <ChartLine data={calorData} color="#B53228" unit="kWh" />
          </div>
          <div id="frio" className="scroll-mt-20">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--frio)' }} />
              <span className="text-[11px] font-medium text-cocoa/40 uppercase tracking-wider">Refrigeración</span>
              <span className="text-[10px] text-cocoa/30 font-mono">kWh</span>
            </div>
            <ChartLine data={frioData} color="#4A7A8C" unit="kWh" />
          </div>
          <div id="acs" className="scroll-mt-20">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--sage)' }} />
              <span className="text-[11px] font-medium text-cocoa/40 uppercase tracking-wider">ACS</span>
              <span className="text-[10px] text-cocoa/30 font-mono">m³</span>
            </div>
            <ChartLine data={acsData} color="#5D7A4A" unit="m³" dashed decimals={3} />
          </div>
        </div>
      )}
    </div>
  );
}
