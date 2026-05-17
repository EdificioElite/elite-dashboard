import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import Header from '../components/Header';
import HistoricoCharts from '../components/HistoricoCharts';
import FacturasChart from '../components/FacturasChart';
import PieChartCard from '../components/PieChartCard';
import ConsumoVecinosChart from '../components/ConsumoVecinosChart';
import FacturaElectricaTable from '../components/FacturaElectricaTable';
import HeatmapChart from '../components/HeatmapChart';
import CopChart from '../components/CopChart';
import { toDatetimeLocal, fromDatetimeLocal, applyPreset, Preset } from '../lib/dates';

interface ConsumoAgregado {
  timestamp: string;
  kwh_calor: number;
  kwh_frio: number;
  m3_acs: number;
  kwh_acs: number;
}

interface FacturaGlobal {
  id_factura: string;
  piso: string;
  periodo: string;
  importe_total: number;
  kwh_calor: number;
  kwh_frio: number;
  kwh_acs: number;
  m3_acs: number;
  importe_calor: number;
  importe_frio: number;
  importe_acs: number;
  fecha_factura_inicio?: string;
  fecha_factura_fin?: string;
}

interface CopDatum {
  id: string;
  startdate: string;
  enddate: string;
  amount: number | null;
  kwh_electricos: number | null;
  kwh_termicos: number | null;
  cop: number | null;
}

export default function AdminAerotermiaPage() {
  const [consumos, setConsumos] = useState<ConsumoAgregado[]>([]);
  const [facturas, setFacturas] = useState<FacturaGlobal[]>([]);
  const [copData, setCopData] = useState<CopDatum[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<Preset | null>('7d');
  const [desdeInput, setDesdeInput] = useState('');
  const [hastaInput, setHastaInput] = useState('');
  const [pisoFacturas, setPisoFacturas] = useState<string>('');

  const setRange = (p: string) => {
    setPreset(p as Preset);
    if (p) {
      const { desde, hasta } = applyPreset(p as Preset);
      setDesdeInput(toDatetimeLocal(desde));
      setHastaInput(toDatetimeLocal(hasta));
    }
  };

  useEffect(() => { setRange('7d'); }, []);

  const desde = desdeInput ? fromDatetimeLocal(desdeInput) : '';
  const hasta = hastaInput ? fromDatetimeLocal(hastaInput) : '';

  useEffect(() => {
    apiFetch<FacturaGlobal[]>('/admin/aerotermia/facturas')
      .then(setFacturas)
      .catch(() => setFacturas([]));
    apiFetch<CopDatum[]>('/admin/aerotermia/cop')
      .then(setCopData)
      .catch(() => setCopData([]));
  }, []);

  useEffect(() => {
    if (!desde || !hasta) return;
    const qs = `?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`;
    apiFetch<ConsumoAgregado[]>(`/admin/aerotermia/consumos${qs}`)
      .then(setConsumos)
      .catch(() => setConsumos([]))
      .finally(() => setLoading(false));
  }, [desde, hasta]);

  const filteredFacturas = useMemo(() => {
    if (!desde || !hasta) return facturas;
    const desdeD = new Date(desde).getTime();
    const hastaD = new Date(hasta).getTime();
    return facturas.filter((f) => {
      const t = new Date(f.periodo).getTime();
      return t >= desdeD && t <= hastaD;
    });
  }, [facturas, desde, hasta]);

  const stats = useMemo(() => {
    const totalCalor = consumos.reduce((sum, c) => sum + Number(c.kwh_calor), 0);
    const totalFrio = consumos.reduce((sum, c) => sum + Number(c.kwh_frio), 0);
    const totalAcs = consumos.reduce((sum, c) => sum + Number(c.m3_acs), 0);
    const totalEuros = filteredFacturas.reduce((sum, f) => sum + Number(f.importe_total), 0);
    return { totalCalor, totalFrio, totalAcs, totalEuros };
  }, [consumos, filteredFacturas]);

  const pieData = useMemo(() => {
    const map = new Map<string, { kwh_total: number; importe: number }>();
    filteredFacturas.forEach((f) => {
      const prev = map.get(f.piso) || { kwh_total: 0, importe: 0 };
      map.set(f.piso, {
        kwh_total: prev.kwh_total + Number(f.kwh_calor) + Number(f.kwh_frio) + Number(f.kwh_acs),
        importe: prev.importe + Number(f.importe_total),
      });
    });
    const total = Array.from(map.values()).reduce((s, v) => s + v.kwh_total, 0);
    return Array.from(map.entries())
      .map(([piso, v]) => ({
        piso,
        kwh_total: v.kwh_total,
        porcentaje: total > 0 ? (v.kwh_total / total) * 100 : 0,
        importe: v.importe,
      }))
      .filter((d) => d.kwh_total > 0)
      .sort((a, b) => b.kwh_total - a.kwh_total);
  }, [filteredFacturas]);

  const vecinosConsumo = useMemo(() => {
    const map = new Map<string, { kwh_calor: number; kwh_frio: number; m3_acs: number; kwh_acs: number }>();
    filteredFacturas.forEach((f) => {
      const prev = map.get(f.piso) || { kwh_calor: 0, kwh_frio: 0, m3_acs: 0, kwh_acs: 0 };
      map.set(f.piso, {
        kwh_calor: prev.kwh_calor + Number(f.kwh_calor),
        kwh_frio: prev.kwh_frio + Number(f.kwh_frio),
        m3_acs: prev.m3_acs + Number(f.m3_acs),
        kwh_acs: prev.kwh_acs + Number(f.kwh_acs),
      });
    });
    return Array.from(map.entries())
      .map(([piso, v]) => ({ piso, ...v }))
      .sort((a, b) => a.piso.localeCompare(b.piso));
  }, [filteredFacturas]);

  const facturasGlobal = useMemo(() => {
    const source = pisoFacturas ? facturas.filter((f) => f.piso === pisoFacturas) : facturas;
    const map = new Map<string, FacturaGlobal>();
    source.forEach((f) => {
      const prev = map.get(f.id_factura);
      if (prev) {
        prev.importe_total += Number(f.importe_total);
        prev.kwh_calor += Number(f.kwh_calor);
        prev.kwh_frio += Number(f.kwh_frio);
        prev.kwh_acs += Number(f.kwh_acs);
        prev.m3_acs += Number(f.m3_acs);
        prev.importe_calor += Number(f.importe_calor);
        prev.importe_frio += Number(f.importe_frio);
        prev.importe_acs += Number(f.importe_acs);
      } else {
        map.set(f.id_factura, {
          ...f,
          importe_total: Number(f.importe_total),
          kwh_calor: Number(f.kwh_calor),
          kwh_frio: Number(f.kwh_frio),
          kwh_acs: Number(f.kwh_acs),
          m3_acs: Number(f.m3_acs),
          importe_calor: Number(f.importe_calor),
          importe_frio: Number(f.importe_frio),
          importe_acs: Number(f.importe_acs),
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.periodo.localeCompare(a.periodo));
  }, [facturas, pisoFacturas]);

  const heatmapData = useMemo(() => {
    return facturas.map((f) => {
      const d = new Date(f.periodo);
      const periodo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return {
        piso: f.piso,
        periodo,
        kwh_calor: Number(f.kwh_calor),
        kwh_frio: Number(f.kwh_frio),
        kwh_acs: Number(f.kwh_acs),
        m3_acs: Number(f.m3_acs),
      };
    });
  }, [facturas]);

  const pisosUnicos = useMemo(() => {
    return [...new Set(facturas.map((f) => f.piso))].sort();
  }, [facturas]);

  if (loading) {
    return (
      <div>
        <Header />
        <main className="max-w-[1180px] mx-auto px-6 flex items-center justify-center min-h-[60vh]">
          <div className="text-cocoa/40 text-sm">Cargando datos del edificio...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-in">
      <Header />

      <main className="max-w-[1180px] mx-auto px-6 flex flex-col gap-[22px] pb-10">
        <div className="pt-2">
          <p className="eyebrow">Panel de administracion</p>
          <h1
            className="font-display text-[40px] font-medium text-cocoa mt-1"
            style={{ letterSpacing: '-0.02em' }}
          >
            Aerotermia Admin
          </h1>
          <p className="text-sm text-cocoa/60 mt-1.5 max-w-lg">
            Dashboard general de consumos y facturas del edificio.
          </p>
        </div>

        <div className="stagger flex flex-col gap-[22px]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-[16px]">
            {[
              { label: 'Total kWh calor', value: stats.totalCalor.toFixed(1), unit: 'kWh', iconBg: 'var(--calor)' },
              { label: 'Total kWh frio', value: stats.totalFrio.toFixed(1), unit: 'kWh', iconBg: 'var(--frio)' },
              { label: 'Total m³ ACS', value: stats.totalAcs.toFixed(2), unit: 'm³', iconBg: 'var(--sage)' },
              { label: 'Total facturado', value: stats.totalEuros.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €', unit: '', iconBg: 'var(--accent)' },
            ].map((s) => (
              <div key={s.label} className="glass p-[20px]">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: s.iconBg }}>
                    <span className="text-cream text-[10px] font-bold">{s.unit.charAt(0)}</span>
                  </div>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-cocoa/40">{s.label}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-[32px] font-medium leading-none text-cocoa" style={{ letterSpacing: '-0.02em' }}>
                    {s.value}
                  </span>
                  {s.unit && <span className="font-mono text-[11px] text-cocoa/40 font-num">{s.unit}</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 glass p-[26px]">
            <span className="eyebrow shrink-0">Periodo</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRange('24h')}
                className={`text-[11px] font-medium uppercase tracking-[0.05em] px-2.5 py-1.5 rounded-md transition-colors ${preset === '24h' ? 'text-cocoa bg-accent/12' : 'text-cocoa/40 hover:text-cocoa'}`}
              >24h</button>
              <button
                onClick={() => setRange('7d')}
                className={`text-[11px] font-medium uppercase tracking-[0.05em] px-2.5 py-1.5 rounded-md transition-colors ${preset === '7d' ? 'text-cocoa bg-accent/12' : 'text-cocoa/40 hover:text-cocoa'}`}
              >7 dias</button>
              <button
                onClick={() => setRange('30d')}
                className={`text-[11px] font-medium uppercase tracking-[0.05em] px-2.5 py-1.5 rounded-md transition-colors ${preset === '30d' ? 'text-cocoa bg-accent/12' : 'text-cocoa/40 hover:text-cocoa'}`}
              >30 dias</button>
              <button
                onClick={() => setRange('3m')}
                className={`text-[11px] font-medium uppercase tracking-[0.05em] px-2.5 py-1.5 rounded-md transition-colors ${preset === '3m' ? 'text-cocoa bg-accent/12' : 'text-cocoa/40 hover:text-cocoa'}`}
              >3 meses</button>
              <button
                onClick={() => setRange('1a')}
                className={`text-[11px] font-medium uppercase tracking-[0.05em] px-2.5 py-1.5 rounded-md transition-colors ${preset === '1a' ? 'text-cocoa bg-accent/12' : 'text-cocoa/40 hover:text-cocoa'}`}
              >1 año</button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-medium uppercase tracking-wider text-cocoa/40 shrink-0">Desde:</label>
              <input type="datetime-local" value={desdeInput} onChange={(e) => { setDesdeInput(e.target.value); setPreset(null); }} className="input-card text-xs py-1.5 px-3" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-medium uppercase tracking-wider text-cocoa/40 shrink-0">Hasta:</label>
              <input type="datetime-local" value={hastaInput} onChange={(e) => { setHastaInput(e.target.value); setPreset(null); }} className="input-card text-xs py-1.5 px-3" />
            </div>
          </div>

          <PieChartCard data={pieData} />

          <ConsumoVecinosChart data={vecinosConsumo} />

          <HistoricoCharts endpoint="/admin/aerotermia/consumos" title="Historico — Global" />

          <div className="glass p-[26px]">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff8ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                </div>
                <span className="eyebrow">Ver dashboard de vecino</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {pisosUnicos.map((p) => (
                  <Link key={p} to={`/aerotermia?piso=${p}`} className="text-[11px] font-medium uppercase tracking-[0.05em] text-cocoa/50 hover:text-cocoa hover:bg-accent/8 px-2.5 py-1.5 rounded-md transition-colors">
                    Piso {p}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <FacturasChart
            data={facturasGlobal}
            headerRight={
              <select value={pisoFacturas} onChange={(e) => setPisoFacturas(e.target.value)} className="input-card text-xs py-2 px-3 min-w-[140px]">
                <option value="">Todos los pisos</option>
                {pisosUnicos.map((p) => <option key={p} value={p}>Piso {p}</option>)}
              </select>
            }
          />

          <CopChart data={copData} />

          <FacturaElectricaTable data={copData} />

          <HeatmapChart data={heatmapData} />
        </div>
      </main>
    </div>
  );
}
