import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fmtMoney } from '../lib/format';

interface PieSlice {
  piso: string;
  kwh_total: number;
  porcentaje: number;
  importe: number;
}

const COLORS = ['#c0392b', '#5b8ba0', '#6f8a5c', '#b88a5e', '#8b6f5a', '#4a7c92', '#9b6b43', '#3a7d6e'];

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

function tooltipContent(props: any) {
  const { active, payload } = props;
  if (!active || !payload || !payload[0]) return null;
  const d = payload[0].payload as PieSlice;
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ fontWeight: 500, marginBottom: 4 }}>Piso {d.piso}</div>
      <div style={{ color: 'rgba(245,236,220,.7)' }}>{d.porcentaje.toFixed(1)}%</div>
      <div style={{ color: 'rgba(245,236,220,.7)' }}>{d.kwh_total.toFixed(1)} kWh</div>
      <div style={{ color: 'rgba(245,236,220,.7)' }}>{fmtMoney(d.importe)}</div>
    </div>
  );
}

function legendContent(props: any) {
  const { payload } = props;
  if (!payload) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
      {payload.map((entry: any, index: number) => {
        const d = entry.payload as PieSlice;
        return (
          <span key={d.piso} className="flex items-center gap-1.5 text-[11px] text-cocoa/50">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[index % COLORS.length] }} />
            {d.piso} ({d.porcentaje.toFixed(0)}%)
          </span>
        );
      })}
    </div>
  );
}

export default function PieChartCard({ data }: { data: PieSlice[] }) {
  if (data.length === 0) {
    return (
      <div className="glass p-[26px]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff8ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" />
            </svg>
          </div>
          <span className="eyebrow">Distribucion por vecino</span>
        </div>
        <p className="text-sm text-cocoa/44 py-8">No hay datos en este periodo</p>
      </div>
    );
  }

  return (
    <div className="glass p-[26px]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff8ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" />
          </svg>
        </div>
        <span className="eyebrow">Distribucion por vecino</span>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={110}
            paddingAngle={3}
            dataKey="kwh_total"
            nameKey="piso"
          >
            {data.map((_entry, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={tooltipContent} />
          <Legend content={legendContent} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
