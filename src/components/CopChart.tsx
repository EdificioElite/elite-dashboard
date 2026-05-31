import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import ChartTooltip from './ChartTooltip';

interface CopDatum {
  id: string;
  startdate: string;
  enddate: string;
  kwh_eléctricos: number | null;
  kwh_térmicos: number | null;
  cop: number | null;
}

function labelMes(fecha: string): string {
  const d = new Date(fecha);
  return d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
}

export default function CopChart({ data }: { data: CopDatum[] }) {
  const chartData = data
    .filter((d) => d.cop != null)
    .slice()
    .reverse();

  if (data.length === 0 || chartData.length === 0) {
    return (
    <div className="glass p-[26px]" aria-label="Gráfica de coeficiente de rendimiento (COP)">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff8ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <span className="eyebrow">COP</span>
          <span className="text-[11px] text-cocoa/40 font-num">(coeficiente de rendimiento)</span>
        </div>
        <p className="text-sm text-cocoa/44 py-8">Sin datos de COP. Se mostrará cuando facturaelectrica tenga kWh eléctricos.</p>
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
          <Tooltip content={<ChartTooltip labelFormatter={(l) => labelMes(l)} />} wrapperStyle={{ zIndex: 9999, pointerEvents: 'none' }} />
          <ReferenceLine y={1} stroke="#1E140A" strokeDasharray="4 4" strokeOpacity={0.2} />
          <Line
            type="monotone"
            dataKey="cop"
            stroke="#A6754B"
            strokeWidth={2}
            dot={{ r: 3, fill: '#fff8ee', stroke: '#A6754B', strokeWidth: 1.5 }}
            activeDot={{ r: 5, fill: '#fff8ee', stroke: '#A6754B', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <p className="text-[10px] text-cocoa/30 mt-3">
        COP = kWh térmicos totales / kWh eléctricos. La línea punteada marca COP = 1 (umbral de eficiencia).
      </p>
    </div>
  );
}
