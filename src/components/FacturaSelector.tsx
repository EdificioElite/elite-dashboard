import { useState, useMemo } from 'react';
import { fmtMoney } from '../lib/format';

interface FacturaGlobal {
  id_factura: string;
  piso: string;
  periodo: string;
  kwh_calor: number;
  kwh_frio: number;
  kwh_acs: number;
  m3_acs: number;
  importe_total: number;
  fecha_factura_inicio?: string;
  fecha_factura_fin?: string;
}

function formatPeriodo(inicio?: string, fin?: string): string {
  if (!inicio) return '';
  const dInicio = new Date(inicio);
  if (!fin) return dInicio.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
  const dFin = new Date(fin);
  const inicioStr = dInicio.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  const finStr = dFin.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${inicioStr} — ${finStr}`;
}

export default function FacturaSelector({ facturas }: { facturas: FacturaGlobal[] }) {
  const [selected, setSelected] = useState('');

  const periodos = useMemo(() => {
    const seen = new Set<string>();
    return facturas
      .filter((f) => {
        const key = f.fecha_factura_inicio || '';
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => (b.fecha_factura_inicio || '').localeCompare(a.fecha_factura_inicio || ''));
  }, [facturas]);

  const detalle = useMemo(() => {
    if (!selected) return [];
    return facturas
      .filter((f) => f.fecha_factura_inicio === selected)
      .sort((a, b) => a.piso.localeCompare(b.piso));
  }, [facturas, selected]);

  if (facturas.length === 0) {
    return (
      <div className="glass p-[26px]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff8ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <span className="eyebrow">Desglose por factura</span>
        </div>
        <p className="text-sm text-cocoa/44 py-8">No hay facturas disponibles</p>
      </div>
    );
  }

  return (
    <div className="glass p-[26px]">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff8ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <span className="eyebrow">Desglose por factura</span>
        </div>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="input-card text-xs py-2 px-3 min-w-[220px]"
        >
          <option value="">Seleccionar periodo...</option>
          {periodos.map((p) => (
            <option key={p.fecha_factura_inicio} value={p.fecha_factura_inicio || ''}>
              {formatPeriodo(p.fecha_factura_inicio, p.fecha_factura_fin)}
            </option>
          ))}
        </select>
      </div>

      {selected && detalle.length > 0 ? (
        <div className="overflow-x-auto -mx-2">
          <table className="table-glass">
            <thead>
              <tr>
                <th>Piso</th>
                <th>kWh Calor</th>
                <th>kWh Frio</th>
                <th>kWh ACS</th>
                <th>m³ ACS</th>
                <th className="text-right">Importe</th>
              </tr>
            </thead>
            <tbody>
              {detalle.map((d, i) => (
                <tr key={d.piso} className="row-stagger" style={{ animationDelay: `${i * 40}ms` }}>
                  <td className="font-medium text-cocoa">{d.piso}</td>
                  <td className="font-mono text-xs font-num">{Number(d.kwh_calor).toFixed(0)}</td>
                  <td className="font-mono text-xs font-num">{Number(d.kwh_frio).toFixed(0)}</td>
                  <td className="font-mono text-xs font-num">{Number(d.kwh_acs).toFixed(0)}</td>
                  <td className="font-mono text-xs font-num">{Number(d.m3_acs).toFixed(1)}</td>
                  <td className="font-mono text-xs text-right font-medium font-num">{fmtMoney(d.importe_total)}</td>
                </tr>
              ))}
              <tr className="border-t border-cocoa/6">
                <td className="font-medium text-cocoa text-xs">Total</td>
                <td className="font-mono text-xs font-num font-medium">{detalle.reduce((s, d) => s + Number(d.kwh_calor), 0).toFixed(0)}</td>
                <td className="font-mono text-xs font-num font-medium">{detalle.reduce((s, d) => s + Number(d.kwh_frio), 0).toFixed(0)}</td>
                <td className="font-mono text-xs font-num font-medium">{detalle.reduce((s, d) => s + Number(d.kwh_acs), 0).toFixed(0)}</td>
                <td className="font-mono text-xs font-num font-medium">{detalle.reduce((s, d) => s + Number(d.m3_acs), 0).toFixed(1)}</td>
                <td className="font-mono text-xs text-right font-medium font-num">{fmtMoney(detalle.reduce((s, d) => s + Number(d.importe_total), 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : selected ? (
        <p className="text-sm text-cocoa/44 py-8">Sin datos para este periodo</p>
      ) : null}
    </div>
  );
}
