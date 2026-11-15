import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import Icon from './Icon';
import { chartTooltipWrapperStyle, chartTooltipSpaceClass, chartTooltipBoxClass, ChartTooltipHint } from './ChartTooltip';

interface Factura {
  id_factura: string;
  periodo: string;
  importe_total: number;
  importe_fijo: number;
  kwh_calor: number;
  kwh_frio: number;
  kwh_acs: number;
  m3_acs: number;
  importe_calor: number;
  importe_frio: number;
  importe_variable_acs: number;
  importe_acs: number;
}

function fmtPeriodo(periodo: string): string {
  const d = new Date(periodo);
  return d.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
}

function fmtNumber(n: number, decimals = 2): string {
  return Number(n).toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function Chip({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: color }} />
      <span className="text-cocoa/60">{label}</span>
      <span className="font-mono text-[11px] font-semibold">{value}</span>
    </span>
  );
}

function FacturasTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: any[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div className={chartTooltipBoxClass}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-cocoa/50">{label}</span>
        <span className="text-[11px] font-semibold">Total {fmtNumber(d.importe_total)} €</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
        <Chip color="#B53228" label="Calor" value={`${fmtNumber(d.kwh_calor, 0)} kWh`} />
        <Chip color="#4A7A8C" label="Frío" value={`${fmtNumber(d.kwh_frio, 0)} kWh`} />
        <Chip color="#5D7A4A" label="ACS" value={`${fmtNumber(d.kwh_acs, 0)} kWh`} />
        <Chip color="#2D8A4A" label="Agua" value={`${fmtNumber(d.m3_acs, 1)} m³`} />
        <Chip color="#A6754B" label="Fijo" value={`${fmtNumber(d.importe_fijo)} €`} />
        <Chip color="#B53228" label="Calef." value={`${fmtNumber(d.importe_calor)} €`} />
        <Chip color="#4A7A8C" label="Refrig." value={`${fmtNumber(d.importe_frio)} €`} />
        <Chip color="#5D7A4A" label="ACS var." value={`${fmtNumber(d.importe_variable_acs)} €`} />
        <Chip color="#2D8A4A" label="ACS agua" value={`${fmtNumber(d.importe_acs)} €`} />
      </div>
    </div>
  );
}

export default function FacturasChart({ data, headerRight }: { data: Factura[]; headerRight?: React.ReactNode }) {
  if (data.length === 0) {
    return (
    <div className="glass p-[26px]" aria-label="Gráfica de facturas por periodo">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
            <Icon name="dollar" size={14} className="text-cream" />
          </div>
          <span className="eyebrow">Facturas</span>
        </div>
        <p className="text-sm text-cocoa/44">No hay facturas disponibles</p>
      </div>
    );
  }

  const chartData = data
    .slice()
    .reverse()
    .map((f) => ({ ...f, periodoLabel: fmtPeriodo(f.periodo) }));

  return (
    <div className="glass p-[26px]">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
            <Icon name="dollar" size={14} className="text-cream" />
          </div>
          <span className="eyebrow">Facturas</span>
        </div>
        {headerRight}
      </div>

      <div className="flex items-center gap-4 mb-4 text-[11px] text-cocoa/40 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: '#A6754B' }} /> Fijo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: '#B53228' }} /> Calefacción
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: '#4A7A8C' }} /> Refrigeración
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: '#5D7A4A' }} /> ACS (energía)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: '#2D8A4A' }} /> ACS (agua)
        </span>
      </div>

      <div className={chartTooltipSpaceClass}>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(58,47,36,.06)" vertical={false} />
            <XAxis dataKey="periodoLabel" fontSize={10} tick={{ fill: 'rgba(58,47,36,.44)' }} axisLine={false} tickLine={false} interval={0} angle={-45} textAnchor="end" height={40} />
            <YAxis fontSize={10} tick={{ fill: 'rgba(58,47,36,.44)', fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} width={55} tickFormatter={(v: number) => `${v.toFixed(0)} €`} />
            <Tooltip cursor={false} content={<FacturasTooltip />} wrapperStyle={chartTooltipWrapperStyle} />
            <Bar dataKey="importe_fijo" stackId="a" fill="#A6754B" radius={[0, 0, 0, 0]} />
            <Bar dataKey="importe_calor" stackId="a" fill="#B53228" radius={[0, 0, 0, 0]} />
            <Bar dataKey="importe_frio" stackId="a" fill="#4A7A8C" radius={[0, 0, 0, 0]} />
            <Bar dataKey="importe_variable_acs" stackId="a" fill="#5D7A4A" radius={[0, 0, 0, 0]} />
            <Bar dataKey="importe_acs" stackId="a" fill="#2D8A4A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <ChartTooltipHint className="h-[92px]" />
      </div>
    </div>
  );
}
