import { fmtMonth, fmtMoney } from '../lib/format';
import Icon from './Icon';

interface Factura {
  id_factura: string;
  periodo: string;
  importe_total: number;
  kwh_calor: number;
  kwh_frio: number;
  kwh_acs: number;
  m3_acs: number;
  importe_calor: number;
  importe_frio: number;
  importe_acs: number;
}

export default function FacturasTable({ data }: { data: Factura[] }) {
  if (data.length === 0) {
    return (
      <div className="glass p-[26px]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
            <Icon name="dollar" size={14} className="text-cream" />
          </div>
          <span className="eyebrow">Facturas</span>
        </div>
        <p className="text-sm text-cocoa/44">No hay facturas disponibles</p>
      </div>
    );
  }

  return (
    <div className="glass p-[26px]">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
          <Icon name="dollar" size={14} className="text-cream" />
        </div>
        <span className="eyebrow">Facturas</span>
      </div>

      <div className="overflow-x-auto -mx-2">
        <table className="table-glass">
          <thead>
            <tr>
              <th>Periodo</th>
              <th>Calefacción</th>
              <th>Refrigeración</th>
              <th>ACS</th>
              <th>m³ ACS</th>
              <th className="text-right">Importe</th>
            </tr>
          </thead>
          <tbody>
            {data.map((f, i) => (
              <tr key={f.id_factura} className="row-stagger" style={{ animationDelay: `${i * 40}ms` }}>
                <td className="font-medium text-cocoa">{fmtMonth(f.periodo)}</td>
                <td className="font-mono text-xs font-num">{Number(f.kwh_calor).toFixed(0)}</td>
                <td className="font-mono text-xs font-num">{Number(f.kwh_frio).toFixed(0)}</td>
                <td className="font-mono text-xs font-num">{Number(f.kwh_acs).toFixed(0)}</td>
                <td className="font-mono text-xs font-num">{Number(f.m3_acs).toFixed(1)}</td>
                <td className="font-mono text-xs text-right font-medium font-num">{fmtMoney(f.importe_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
