import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, Label } from 'recharts';
import ChartTooltip from './ChartTooltip';

interface PieSlice {
  piso: string;
  kwh_total: number;
  porcentaje: number;
  importe: number;
}

const COLORS = ['#B53228', '#4A7A8C', '#5D7A4A', '#A6754B', '#8B6B4A', '#4A7A8C', '#A6754B', '#5D7A4A'];

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

  const total = data.reduce((sum, d) => sum + d.kwh_total, 0);

  return (
    <div className="glass p-[26px]" aria-label="Gráfica de distribución de consumo por vecino">
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
            innerRadius="70%"
            outerRadius={110}
            paddingAngle={3}
            dataKey="kwh_total"
            nameKey="piso"
          >
            {data.map((_entry, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} stroke="transparent" />
            ))}
            <Label
              value={total}
              position="center"
              style={{ fontFamily: "'Fraunces', serif", fontSize: '24px', fontWeight: 500, fill: '#1E140A' }}
            />
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend content={legendContent} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
