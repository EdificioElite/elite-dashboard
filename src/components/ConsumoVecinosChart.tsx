import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface VecinoConsumo {
  piso: string;
  kwh_calor: number;
  kwh_frio: number;
  m3_acs: number;
  kwh_acs: number;
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

function tooltipContent(props: any) {
  const { active, payload, label } = props;
  if (!active || !payload) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ fontWeight: 500, marginBottom: 6 }}>Piso {label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(245,236,220,.7)', gap: 12 }}>
          <span>
            <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: p.color, marginRight: 5, verticalAlign: 'middle' }} />
            {p.name}
          </span>
          <span>{Number(p.value).toFixed(1)} {p.dataKey === 'm3_acs' ? 'm³' : 'kWh'}</span>
        </div>
      ))}
    </div>
  );
}

export default function ConsumoVecinosChart({ data }: { data: VecinoConsumo[] }) {
  if (data.length === 0) {
    return (
      <div className="glass p-[26px]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff8ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
            </svg>
          </div>
          <span className="eyebrow">Consumo por vecino</span>
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
            <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
          </svg>
        </div>
        <span className="eyebrow">Consumo por vecino</span>
      </div>

      <div className="flex items-center gap-4 mb-4 text-[11px] text-cocoa/40">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: '#c0392b' }} /> Calefaccion</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: '#5b8ba0' }} /> Refrigeracion</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: '#6f8a5c' }} /> ACS</span>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="rgba(58,47,36,.06)" vertical={false} />
          <XAxis dataKey="piso" fontSize={10} tick={{ fill: 'rgba(58,47,36,.44)' }} axisLine={false} tickLine={false} />
          <YAxis fontSize={10} tick={{ fill: 'rgba(58,47,36,.44)', fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} width={45} />
          <Tooltip content={tooltipContent} cursor={{ fill: 'rgba(58,47,36,.04)' }} />
          <Bar dataKey="kwh_calor" fill="#c0392b" radius={[3, 3, 0, 0]} />
          <Bar dataKey="kwh_frio" fill="#5b8ba0" radius={[3, 3, 0, 0]} />
          <Bar dataKey="kwh_acs" fill="#6f8a5c" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
