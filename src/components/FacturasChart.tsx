import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fmtMoney } from '../lib/format';
import Icon from './Icon';

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

const TOOLTIP_STYLE: React.CSSProperties = {
  background: 'rgba(58,47,36,.92)',
  border: 'none',
  borderRadius: '10px',
  color: '#f5ecdc',
  fontSize: '11.5px',
  fontFamily: "'Manrope', sans-serif",
  padding: '10px 12px',
  boxShadow: '0 4px 16px rgba(0,0,0,.15)',
  minWidth: '190px',
};

function tooltipContent(props: any) {
  const { active, payload } = props;
  if (!active || !payload || !payload[0]?.payload) return null;
  const f = payload[0].payload as Factura & { periodoLabel: string };

  const row = (label: string, value: string, dotColor?: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', color: 'rgba(245,236,220,.7)' }}>
      <span>
        {dotColor ? <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: dotColor, marginRight: 5, verticalAlign: 'middle' }} /> : null}
        {label}
      </span>
      <span>{value}</span>
    </div>
  );

  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ fontWeight: 500, marginBottom: 6 }}>{f.periodoLabel}</div>
      {row('Fijo', fmtMoney(f.importe_fijo), '#8b7355')}
      {row('Calefacción', fmtMoney(f.importe_calor), '#c0392b')}
      {row('Refrigeración', fmtMoney(f.importe_frio), '#5b8ba0')}
      {row('ACS (energía)', fmtMoney(f.importe_variable_acs), '#4a7d6e')}
      {row('ACS (agua)', fmtMoney(f.importe_acs), '#6f8a5c')}
      <div style={{ marginTop: 4 }}>
        {row('kWh calor', String(f.kwh_calor))}
        {row('kWh frio', String(f.kwh_frio))}
        {row('kWh ACS', String(f.kwh_acs))}
        {row('m³ ACS', Number(f.m3_acs).toFixed(1))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '.5px solid rgba(245,236,220,.15)', marginTop: 4, paddingTop: 4, fontWeight: 500 }}>
        <span>Total</span><span>{fmtMoney(f.importe_total)}</span>
      </div>
    </div>
  );
}

export default function FacturasChart({ data, headerRight }: { data: Factura[]; headerRight?: React.ReactNode }) {
  if (data.length === 0) {
    return (
      <div className="glass p-[26px]">
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

      <div className="flex items-center gap-4 mb-4 text-[11px] text-cocoa/40">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: '#8b7355' }} /> Fijo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: '#c0392b' }} /> Calefaccion
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: '#5b8ba0' }} /> Refrigeracion
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: '#4a7d6e' }} /> ACS (energia)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: '#6f8a5c' }} /> ACS (agua)
        </span>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="rgba(58,47,36,.06)" vertical={false} />
          <XAxis dataKey="periodoLabel" fontSize={10} tick={{ fill: 'rgba(58,47,36,.44)' }} axisLine={false} tickLine={false} interval={0} angle={-45} textAnchor="end" height={40} />
          <YAxis fontSize={10} tick={{ fill: 'rgba(58,47,36,.44)', fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} width={45} tickFormatter={(v: number) => `${v.toFixed(0)}`} />
          <Tooltip content={tooltipContent} cursor={{ fill: 'rgba(58,47,36,.04)' }} />
          <Bar dataKey="importe_fijo" stackId="a" fill="#8b7355" radius={[0, 0, 0, 0]} />
          <Bar dataKey="importe_calor" stackId="a" fill="#c0392b" radius={[0, 0, 0, 0]} />
          <Bar dataKey="importe_frio" stackId="a" fill="#5b8ba0" radius={[0, 0, 0, 0]} />
          <Bar dataKey="importe_variable_acs" stackId="a" fill="#4a7d6e" radius={[0, 0, 0, 0]} />
          <Bar dataKey="importe_acs" stackId="a" fill="#6f8a5c" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
