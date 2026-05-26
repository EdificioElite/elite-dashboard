import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, Label } from 'recharts';
import ChartTooltip from './ChartTooltip';
import Icon from './Icon';

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
    <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-2">
      {payload.map((entry: any, index: number) => {
        const d = entry.payload as PieSlice;
        return (
          <span key={d.piso} className="flex items-center gap-1.5 text-[10px] text-cocoa/50">
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
            <Icon name="pieChart" size={14} className="text-cream" />
          </div>
          <span className="eyebrow">Distribución por vecino</span>
        </div>
        <p className="text-sm text-cocoa/44 py-8">No hay datos en este periodo</p>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.kwh_total, 0);
  const topN = data.slice(0, 15);
  const othersKwh = data.length > 15 ? data.slice(15).reduce((s, d) => s + d.kwh_total, 0) : 0;
  const othersImporte = data.length > 15 ? data.slice(15).reduce((s, d) => s + d.importe, 0) : 0;
  const displayData = data.length > 15 && othersKwh > 0
    ? [...topN, { piso: 'Otros', kwh_total: othersKwh, porcentaje: total > 0 ? (othersKwh / total) * 100 : 0, importe: othersImporte }]
    : data;

  return (
    <div className="glass p-[26px]" aria-label="Gráfica de distribución de consumo por vecino">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
          <Icon name="pieChart" size={14} className="text-cream" />
        </div>
        <span className="eyebrow">Distribución por vecino</span>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={displayData}
            cx="50%"
            cy="50%"
            innerRadius="65%"
            outerRadius={90}
            paddingAngle={3}
            dataKey="kwh_total"
            nameKey="piso"
          >
            {displayData.map((_entry, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} stroke="transparent" />
            ))}
            <Label
              value={total}
              position="center"
              style={{ fontFamily: "'Fraunces', serif", fontSize: '24px', fontWeight: 500, fill: '#1E140A' }}
            />
          </Pie>
          <Tooltip content={<ChartTooltip unit="kWh" />} wrapperStyle={{ zIndex: 9999, pointerEvents: 'none' }} />
          <Legend content={legendContent} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
