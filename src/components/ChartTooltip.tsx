import type { CSSProperties } from 'react';

type RechartsPayload = Array<{
  name: string;
  value: number | null | undefined;
  color?: string;
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

/**
 * Estilo del wrapper de Recharts para anclar el popup justo debajo del área de
 * dibujo (nunca encima de los datos) y a todo el ancho de la tarjeta.
 */
export const chartTooltipWrapperStyle: CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  transform: 'none',
  transition: 'none',
  zIndex: 9999,
  pointerEvents: 'none',
  paddingTop: 8,
};

/** Contenedor de la gráfica: reserva una franja inferior y evita seleccionar texto al pulsar. */
export const chartTooltipSpaceClass = 'relative select-none';

/** Franja reservada bajo la gráfica para que el popup no tape el contenido siguiente. */
export function ChartTooltipHint({ text = 'Toca o pasa el cursor para ver los valores', className = 'h-14' }: { text?: string; className?: string }) {
  return (
    <div className={`${className} flex items-start justify-center pt-2`}>
      <p className="pointer-events-none m-0 text-center text-[10px] leading-tight text-cocoa/30">{text}</p>
    </div>
  );
}

export const chartTooltipBoxClass =
  'w-full rounded-[10px] border border-[rgba(30,20,10,0.08)] bg-[#FFFBF5] px-3 py-2 font-sans text-xs text-cocoa shadow-[0_4px_16px_rgba(30,20,10,0.08)]';

export default function ChartTooltip({ active, payload, label, labelFormatter, unit }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className={chartTooltipBoxClass}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {label && (
          <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-cocoa/50">
            {labelFormatter ? labelFormatter(label, payload) : label}
          </span>
        )}
        {payload.map((entry, i) => {
          const entryUnit = typeof unit === 'string' ? unit : (unit?.[entry.name] ?? '');
          return (
            <span key={i} className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: entry.color ?? (entry.payload?.fill as string) ?? 'currentColor' }} />
              <span className="text-cocoa/60">{entry.name}</span>
              <span className="font-mono text-[11px] font-semibold">
                {fmtVal(entry.value)}
                {entryUnit ? ` ${entryUnit}` : ''}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
