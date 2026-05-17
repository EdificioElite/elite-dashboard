import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { fmtMoney, fmtMonth } from '../lib/format';

interface FacturaOption {
  id_factura: string;
  periodo: string;
}

interface FacturaDetalle {
  piso: string;
  kwh_calor: number;
  kwh_frio: number;
  kwh_acs: number;
  m3_acs: number;
  importe_total: number;
}

export default function FacturaSelector({ facturas }: { facturas: FacturaOption[] }) {
  const [selected, setSelected] = useState('');
  const [detalle, setDetalle] = useState<FacturaDetalle[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selected) {
      setDetalle([]);
      return;
    }
    setLoading(true);
    apiFetch<FacturaDetalle[]>(`/admin/aerotermia/facturas/${encodeURIComponent(selected)}`)
      .then(setDetalle)
      .catch(() => setDetalle([]))
      .finally(() => setLoading(false));
  }, [selected]);

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
          <option value="">Seleccionar factura...</option>
          {facturas.map((f) => (
            <option key={f.id_factura} value={f.id_factura}>
              {f.id_factura} — {fmtMonth(f.periodo)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-cocoa/44 py-8">Cargando...</p>
      ) : selected && detalle.length > 0 ? (
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
            </tbody>
          </table>
        </div>
      ) : selected ? (
        <p className="text-sm text-cocoa/44 py-8">Sin datos para esta factura</p>
      ) : null}
    </div>
  );
}
