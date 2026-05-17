import { useMemo } from 'react';

interface HeatmapDatum {
  piso: string;
  periodo: string;
  kwh_calor: number;
  kwh_frio: number;
  kwh_acs: number;
  m3_acs: number;
}

function colorScale(value: number, max: number): string {
  if (max === 0) return 'rgba(184,138,94,0.05)';
  const intensity = value / max;
  if (intensity === 0) return 'rgba(184,138,94,0.05)';
  const r = 184;
  const g = Math.round(138 * (1 - intensity * 0.7));
  const b = Math.round(94 * (1 - intensity * 0.8));
  const alpha = 0.15 + intensity * 0.85;
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function HeatmapChart({ data }: { data: HeatmapDatum[] }) {
  const { pisos, periodos, matrix, maxKwh } = useMemo(() => {
    const uniquePisos = [...new Set(data.map((d) => d.piso))].sort();
    const uniquePeriodos = [...new Set(data.map((d) => d.periodo))].sort();
    const map = new Map<string, number>();
    let max = 0;
    data.forEach((d) => {
      const key = `${d.piso}__${d.periodo}`;
      const total = d.kwh_calor + d.kwh_frio + d.kwh_acs;
      map.set(key, total);
      if (total > max) max = total;
    });
    return { pisos: uniquePisos, periodos: uniquePeriodos, matrix: map, maxKwh: max };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="glass p-[26px]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff8ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
          </div>
          <span className="eyebrow">Heatmap mensual</span>
        </div>
        <p className="text-sm text-cocoa/44 py-8">No hay datos disponibles</p>
      </div>
    );
  }

  return (
    <div className="glass p-[26px]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff8ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
          </svg>
        </div>
        <span className="eyebrow">Heatmap mensual</span>
        <span className="text-[11px] text-cocoa/40 font-num">kWh totales</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left font-medium text-cocoa/40 uppercase tracking-wider py-1 pr-3 text-[10px]">Piso</th>
              {periodos.map((p) => (
                <th key={p} className="text-center font-medium text-cocoa/40 uppercase tracking-wider py-1 px-2 text-[10px]">
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pisos.map((piso) => (
              <tr key={piso}>
                <td className="font-medium text-cocoa py-1 pr-3 text-[11px]">{piso}</td>
                {periodos.map((periodo) => {
                  const val = matrix.get(`${piso}__${periodo}`) ?? 0;
                  return (
                    <td key={periodo} className="p-1">
                      <div
                        className="rounded-md flex items-center justify-center min-w-[48px] h-[36px] font-mono text-[10px] text-cocoa/70 transition-colors cursor-default hover:ring-1 hover:ring-accent/20"
                        style={{ background: colorScale(val, maxKwh) }}
                        title={`${piso} - ${periodo}: ${val.toFixed(1)} kWh`}
                      >
                        {val > 0 ? val.toFixed(0) : '—'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 mt-4 justify-end text-[10px] text-cocoa/40">
        <span>Min</span>
        <div className="flex h-3 rounded-sm overflow-hidden">
          <div className="w-5" style={{ background: colorScale(maxKwh * 0.1, maxKwh) }} />
          <div className="w-5" style={{ background: colorScale(maxKwh * 0.3, maxKwh) }} />
          <div className="w-5" style={{ background: colorScale(maxKwh * 0.5, maxKwh) }} />
          <div className="w-5" style={{ background: colorScale(maxKwh * 0.7, maxKwh) }} />
          <div className="w-5" style={{ background: colorScale(maxKwh * 0.9, maxKwh) }} />
        </div>
        <span>Max</span>
      </div>
    </div>
  );
}
