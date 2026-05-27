type RechartsPayload = Array<{
  name: string;
  value: number | null | undefined;
  color: string;
  payload?: Record<string, unknown>;
}>;

interface ChartTooltipProps {
  active?: boolean;
  payload?: RechartsPayload;
  label?: string;
  labelFormatter?: (label: string, payload: RechartsPayload) => string;
  unit?: string | Record<string, string>;
}

function fmtVal(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—';
  if (Number.isInteger(value)) return value.toLocaleString('es-ES');
  return value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ChartTooltip({ active, payload, label, labelFormatter, unit }: ChartTooltipProps) {
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
        zIndex: 9999,
        position: 'relative',
      }}
    >
      {label && (
        <div style={{ fontWeight: 600, marginBottom: 6, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.5 }}>
          {labelFormatter ? labelFormatter(label, payload) : label}
        </div>
      )}
      {payload.map((entry, i) => {
        const entryUnit = typeof unit === 'string' ? unit : (unit?.[entry.name] ?? '');
        return (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
          <span style={{ opacity: 0.7 }}>{entry.name}:</span>
          <span style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>
            {fmtVal(entry.value)}{entryUnit ? ` ${entryUnit}` : ''}
          </span>
        </div>
        );
      })}
    </div>
  );
}
