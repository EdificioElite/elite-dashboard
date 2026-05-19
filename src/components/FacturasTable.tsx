import { Fragment, useMemo } from 'react';
import { capitalizar } from '../lib/format';
import Icon from './Icon';

interface Factura {
  id_factura: string;
  periodo: string;
  importe_total: number;
  importe_fijo: number;
  kwh_calor: number;
  kwh_frio: number;
  kwh_acs: number;
  m3_acs: number;
  importe_calor: number;
  importe_frio: number;
  importe_variable_acs: number;
  importe_acs: number;
}

function fmt(val: number, decimals: number, unit: string): string {
  return Number(val).toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + ' ' + unit;
}

function periodoLabel(f: Factura): string {
  const d = new Date(f.periodo);
  return capitalizar(d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }));
}

interface RowDef {
  label: string;
  accessor: (f: Factura) => string;
  bold?: boolean;
  section?: string;
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

  const chrono = useMemo(() => [...data].reverse(), [data]);

  const rows: RowDef[] = [
    { label: 'kWh calor', accessor: (f) => fmt(f.kwh_calor, 0, 'kWh'), section: 'Consumos' },
    { label: 'kWh frio', accessor: (f) => fmt(f.kwh_frio, 0, 'kWh') },
    { label: 'kWh ACS', accessor: (f) => fmt(f.kwh_acs, 0, 'kWh') },
    { label: 'm³ ACS', accessor: (f) => fmt(f.m3_acs, 1, 'm³') },
    { label: 'Fijo', accessor: (f) => fmt(f.importe_fijo, 2, '€'), section: 'Importes' },
    { label: 'Calefacción', accessor: (f) => fmt(f.importe_calor, 2, '€') },
    { label: 'Refrigeración', accessor: (f) => fmt(f.importe_frio, 2, '€') },
    { label: 'ACS variable', accessor: (f) => fmt(f.importe_variable_acs, 2, '€') },
    { label: 'ACS agua', accessor: (f) => fmt(f.importe_acs, 2, '€') },
    { label: 'Total', accessor: (f) => fmt(f.importe_total, 2, '€'), bold: true },
  ];

  return (
    <div className="glass p-[26px]">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
          <Icon name="dollar" size={14} className="text-cream" />
        </div>
        <span className="eyebrow">Facturas</span>
      </div>

      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-xs border-separate" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-cream text-left font-medium text-cocoa/40 uppercase tracking-wider py-2 pr-4 text-[10px] border-b border-cocoa/6" style={{ minWidth: '100px' }} />
              {chrono.map((f) => (
                <th key={f.id_factura} className="text-center font-medium text-cocoa/40 uppercase tracking-wider py-2 px-3 text-[10px] border-b border-cocoa/6 whitespace-nowrap min-w-[80px]">
                  {periodoLabel(f)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Fragment key={row.label}>
                {row.section && (
                  <tr key={`sec-${row.section}`}>
                    <td colSpan={data.length + 1} className="pt-4 pb-1">
                      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-cocoa/30">{row.section}</span>
                    </td>
                  </tr>
                )}
                <tr key={row.label}>
                  <td className={`sticky left-0 z-10 bg-cream py-1.5 pr-4 text-cocoa/60 text-[11px] ${row.bold ? 'font-semibold text-cocoa border-t border-cocoa/8' : ''}`} style={{ minWidth: '100px' }}>
                    {row.label}
                  </td>
                  {chrono.map((f) => (
                    <td key={f.id_factura} className={`text-center font-mono text-[11px] text-cocoa/80 py-1.5 px-3 font-num whitespace-nowrap ${row.bold ? 'font-semibold text-cocoa border-t border-cocoa/8' : ''}`}>
                      {row.accessor(f)}
                    </td>
                  ))}
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
