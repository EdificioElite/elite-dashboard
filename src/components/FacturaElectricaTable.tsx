import { fmtMoney } from '../lib/format';

interface CopDatum {
  id: string;
  startdate: string;
  enddate: string;
  amount: number | null;
  kwh_electricos: number | null;
  kwh_termicos: number | null;
  cop: number | null;
}

function fmtPeriodo(inicio: string, fin: string): string {
  const dIni = new Date(inicio);
  const dFin = new Date(fin);
  const ini = dIni.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  const finStr = dFin.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${ini} — ${finStr}`;
}

export default function FacturaElectricaTable({ data }: { data: CopDatum[] }) {
  if (data.length === 0) {
    return (
      <div className="glass p-[26px]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff8ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span className="eyebrow">Facturas electricas</span>
        </div>
        <p className="text-sm text-cocoa/44 py-8">No hay facturas electricas disponibles</p>
      </div>
    );
  }

  return (
    <div className="glass p-[26px]">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff8ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
        <span className="eyebrow">Facturas electricas</span>
        <span className="text-[11px] text-cocoa/40 font-num">edificio</span>
      </div>

      <div className="overflow-x-auto -mx-2">
        <table className="table-glass">
          <thead>
            <tr>
              <th>Periodo</th>
              <th>kWh elec.</th>
              <th>kWh term.</th>
              <th>COP</th>
              <th className="text-right">Importe</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={d.id} className="row-stagger" style={{ animationDelay: `${i * 40}ms` }}>
                <td className="font-medium text-cocoa">{fmtPeriodo(d.startdate, d.enddate)}</td>
                <td className="font-mono text-xs font-num">{d.kwh_electricos?.toLocaleString() ?? '—'}</td>
                <td className="font-mono text-xs font-num">{d.kwh_termicos ? Number(d.kwh_termicos).toFixed(0) : '—'}</td>
                <td className="font-mono text-xs font-num">{d.cop?.toFixed(2) ?? '—'}</td>
                <td className="font-mono text-xs text-right font-medium font-num">{d.amount != null ? fmtMoney(d.amount) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
