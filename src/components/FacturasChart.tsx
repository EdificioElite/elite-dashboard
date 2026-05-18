import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

function fmtNumber(n: number, decimals = 2): string {
  return Number(n).toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
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
    <div
      style={{
        background: '#FFFBF5',
        border: '1px solid rgba(30,20,10,0.08)',
        borderRadius: '10px',
        padding: '12px 16px',
        boxShadow: '0 4px 16px rgba(30,20,10,0.08)',
        fontSize: '12px',
        fontFamily: "'Manrope', sans-serif",
        color: '#1E140A',
        minWidth: '220px',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.5 }}>
        {label}
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.4, marginBottom: 4 }}>Consumos</div>
        <Row label="kWh calor" value={fmtNumber(d.kwh_calor, 0) + ' kWh'} />
        <Row label="kWh frio" value={fmtNumber(d.kwh_frio, 0) + ' kWh'} />
        <Row label="kWh ACS" value={fmtNumber(d.kwh_acs, 0) + ' kWh'} />
        <Row label="m³ ACS" value={fmtNumber(d.m3_acs, 1) + ' m³'} />
      </div>
      <div>
        <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.4, marginBottom: 4 }}>Importes</div>
        <Row label="Fijo" value={fmtNumber(d.importe_fijo) + ' €'} />
        <Row label="Calefacción" value={fmtNumber(d.importe_calor) + ' €'} />
        <Row label="Refrigeración" value={fmtNumber(d.importe_frio) + ' €'} />
        <Row label="ACS variable" value={fmtNumber(d.importe_variable_acs) + ' €'} />
        <Row label="ACS agua" value={fmtNumber(d.importe_acs) + ' €'} />
        <div style={{ borderTop: '1px solid rgba(30,20,10,0.08)', marginTop: 4, paddingTop: 4 }}>
          <Row label="Total" value={fmtNumber(d.importe_total) + ' €'} bold />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5px 0', fontSize: '11px', fontWeight: bold ? 600 : 400 }}>
      <span style={{ opacity: 0.6 }}>{label}</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: bold ? 600 : 500 }}>{value}</span>
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

      <div className="flex items-center gap-4 mb-4 text-[11px] text-cocoa/40">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: '#A6754B' }} /> Fijo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: '#B53228' }} /> Calefaccion
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: '#4A7A8C' }} /> Refrigeracion
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: '#5D7A4A' }} /> ACS (energia)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: '#2D8A4A' }} /> ACS (agua)
        </span>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="rgba(58,47,36,.06)" vertical={false} />
          <XAxis dataKey="periodoLabel" fontSize={10} tick={{ fill: 'rgba(58,47,36,.44)' }} axisLine={false} tickLine={false} interval={0} angle={-45} textAnchor="end" height={40} />
          <YAxis fontSize={10} tick={{ fill: 'rgba(58,47,36,.44)', fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} width={55} tickFormatter={(v: number) => `${v.toFixed(0)} €`} />
          <Tooltip content={<FacturasTooltip />} cursor={{ fill: 'rgba(58,47,36,.04)' }} />
          <Bar dataKey="importe_fijo" stackId="a" fill="#A6754B" radius={[0, 0, 0, 0]} />
          <Bar dataKey="importe_calor" stackId="a" fill="#B53228" radius={[0, 0, 0, 0]} />
          <Bar dataKey="importe_frio" stackId="a" fill="#4A7A8C" radius={[0, 0, 0, 0]} />
          <Bar dataKey="importe_variable_acs" stackId="a" fill="#5D7A4A" radius={[0, 0, 0, 0]} />
          <Bar dataKey="importe_acs" stackId="a" fill="#2D8A4A" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
