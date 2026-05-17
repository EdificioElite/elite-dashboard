interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
  labelFormatter?: (label: string) => string;
}

export default function ChartTooltip({ active, payload, label, labelFormatter }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: '#FFFBF5',
        border: '1px solid rgba(30,20,10,0.08)',
        borderRadius: '10px',
        padding: '10px 14px',
        boxShadow: '0 4px 16px rgba(30,20,10,0.08)',
        fontSize: '12px',
        fontFamily: "'Manrope', sans-serif",
        color: '#1E140A',
      }}
    >
      {label && (
        <div style={{ fontWeight: 600, marginBottom: 6, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.5 }}>
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      )}
      {payload.map((entry, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
          <span style={{ opacity: 0.7 }}>{entry.name}:</span>
          <span style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
}
