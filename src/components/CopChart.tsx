import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface CopDatum {
  id: string;
  startdate: string;
  enddate: string;
  kwh_electricos: number | null;
  kwh_termicos: number | null;
  cop: number | null;
}

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

function labelMes(fecha: string): string {
  const d = new Date(fecha);
  return d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
}

function tooltipContent(props: any) {
  const { active, payload } = props;
  if (!active || !payload || !payload[0]) return null;
  const d = payload[0].payload as CopDatum;
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ fontWeight: 500, marginBottom: 4 }}>{labelMes(d.startdate)}</div>
      <div style={{ color: 'rgba(245,236,220,.7)' }}>COP: {d.cop != null ? d.cop.toFixed(2) : '—'}</div>
      <div style={{ color: 'rgba(245,236,220,.5)', fontSize: '10px' }}>
        {d.kwh_termicos != null ? (Number(d.kwh_termicos) / 1).toFixed(0) : '—'} kWh term
      </div>
      <div style={{ color: 'rgba(245,236,220,.5)', fontSize: '10px' }}>
        {d.kwh_electricos != null ? d.kwh_electricos.toLocaleString() : '—'} kWh elec
      </div>
    </div>
  );
}

export default function CopChart({ data }: { data: CopDatum[] }) {
  const chartData = data
    .filter((d) => d.cop != null)
    .slice()
    .reverse();

  if (data.length === 0 || chartData.length === 0) {
    return (
      <div className="glass p-[26px]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff8ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <span className="eyebrow">COP</span>
          <span className="text-[11px] text-cocoa/40 font-num">(coeficiente de rendimiento)</span>
        </div>
        <p className="text-sm text-cocoa/44 py-8">Sin datos de COP. Se mostrara cuando facturaelectrica tenga kWh electricos.</p>
      </div>
    );
  }

  const maxCop = Math.max(...chartData.map((d) => d.cop ?? 0));

  return (
    <div className="glass p-[26px]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff8ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <span className="eyebrow">COP</span>
        <span className="text-[11px] text-cocoa/40 font-num">(coeficiente de rendimiento)</span>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="rgba(58,47,36,.06)" vertical={false} />
          <XAxis
            dataKey="startdate"
            fontSize={10}
            tick={{ fill: 'rgba(58,47,36,.44)' }}
            axisLine={false} tickLine={false}
            tickFormatter={labelMes}
          />
          <YAxis
            fontSize={10}
            tick={{ fill: 'rgba(58,47,36,.44)', fontFamily: "'JetBrains Mono', monospace" }}
            axisLine={false} tickLine={false}
            domain={[0, Math.max(maxCop * 1.15, 2)]}
            width={35}
          />
          <Tooltip content={tooltipContent} />
          <ReferenceLine y={1} stroke="rgba(58,47,36,.15)" strokeDasharray="4 3" />
          <Line
            type="monotone"
            dataKey="cop"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ r: 3, fill: '#fff8ee', stroke: 'var(--accent)', strokeWidth: 1.5 }}
            activeDot={{ r: 5, fill: '#fff8ee', stroke: 'var(--accent)', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <p className="text-[10px] text-cocoa/30 mt-3">
        COP = kWh termicos totales / kWh electricos. La linea punteada marca COP = 1 (umbral de eficiencia).
      </p>
    </div>
  );
}
