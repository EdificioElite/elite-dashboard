import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import Icon from '../components/Icon';
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
  importe_fijo: number;
  kwh_calor: number;
  kwh_frio: number;
  kwh_acs: number;
  m3_acs: number;
  importe_calor: number;
  importe_frio: number;
  importe_variable_acs: number;
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

  const [sections, setSections] = useState<Record<string, boolean>>({
    kpi: true,
    charts: true,
    historico: true,
    facturas: true,
    cop: true,
    heatmap: false,
  });

  const toggleSection = (key: string) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setRange = (p: string) => {
    setPreset(p as Preset);
    if (p) {
      const { desde, hasta } = applyPreset(p as Preset);
      setDesdeInput(toDatetimeLocal(desde));
      setHastaInput(toDatetimeLocal(hasta));
    }
  };

  useEffect(() => { setRange('3m'); }, []);

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
    const source = pisoFacturas ? filteredFacturas.filter((f) => f.piso === pisoFacturas) : filteredFacturas;
    const map = new Map<string, FacturaGlobal>();
    source.forEach((f) => {
      const prev = map.get(f.id_factura);
      if (prev) {
        prev.importe_total += Number(f.importe_total);
        prev.importe_fijo += Number(f.importe_fijo);
        prev.kwh_calor += Number(f.kwh_calor);
        prev.kwh_frio += Number(f.kwh_frio);
        prev.kwh_acs += Number(f.kwh_acs);
        prev.m3_acs += Number(f.m3_acs);
        prev.importe_calor += Number(f.importe_calor);
        prev.importe_frio += Number(f.importe_frio);
        prev.importe_variable_acs += Number(f.importe_variable_acs);
        prev.importe_acs += Number(f.importe_acs);
      } else {
        map.set(f.id_factura, {
          ...f,
          importe_total: Number(f.importe_total),
          importe_fijo: Number(f.importe_fijo),
          kwh_calor: Number(f.kwh_calor),
          kwh_frio: Number(f.kwh_frio),
          kwh_acs: Number(f.kwh_acs),
          m3_acs: Number(f.m3_acs),
          importe_calor: Number(f.importe_calor),
          importe_frio: Number(f.importe_frio),
          importe_variable_acs: Number(f.importe_variable_acs),
          importe_acs: Number(f.importe_acs),
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.periodo.localeCompare(a.periodo));
  }, [filteredFacturas, pisoFacturas]);

  const heatmapData = useMemo(() => {
    return filteredFacturas.map((f) => {
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
  }, [filteredFacturas]);

  const pisosUnicos = useMemo(() => {
    return [...new Set(filteredFacturas.map((f) => f.piso))].sort();
  }, [filteredFacturas]);

  const filteredCopData = useMemo(() => {
    if (!desde || !hasta) return copData;
    const desdeD = new Date(desde).getTime();
    const hastaD = new Date(hasta).getTime();
    return copData.filter((c) => {
      const t = new Date(c.startdate).getTime();
      return t >= desdeD && t <= hastaD;
    });
  }, [copData, desde, hasta]);

  const SectionHeader = ({ id, label, icon }: { id: string; label: string; icon: string }) => (
    <button
      onClick={() => toggleSection(id)}
      className="flex items-center gap-3 w-full text-left py-3"
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-2)' }}>
        <Icon name={icon} size={14} className="text-cream" />
      </div>
      <span className="eyebrow flex-1">{label}</span>
      <Icon name={sections[id] ? 'chevronUp' : 'chevronDown'} size={16} className="text-cocoa/30" />
    </button>
  );

  if (loading) {
    return (
      <div>
        <main className="max-w-[1180px] mx-auto px-6 flex items-center justify-center min-h-[60vh]">
          <div className="text-cocoa/40 text-sm">Cargando datos del edificio...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-in">
      <main className="max-w-[1180px] mx-auto px-6 flex flex-col gap-[22px] pb-10">
        <div className="pt-2">
          <div className="flex items-center gap-2 text-sm mb-3">
            <Link to="/admin/vecinos" className="text-accent hover:text-accent-dark">Admin</Link>
            <span className="text-cocoa/30">→</span>
            <span className="text-cocoa/60">Aerotermia</span>
          </div>
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

        <div className="stagger flex flex-col gap-[22px]">
          <div className="glass p-[26px]">
            <SectionHeader id="kpi" label="KPI" icon="barChart" />
            {sections.kpi && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-[16px] mt-3">
                {[
                  { label: 'Total kWh calor', value: stats.totalCalor.toFixed(1), unit: 'kWh', iconBg: 'var(--calor)' },
                  { label: 'Total kWh frio', value: stats.totalFrio.toFixed(1), unit: 'kWh', iconBg: 'var(--frio)' },
                  { label: 'Total m³ ACS', value: stats.totalAcs.toFixed(2), unit: 'm³', iconBg: 'var(--sage)' },
                  { label: 'Total facturado', value: stats.totalEuros.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €', unit: '', iconBg: 'var(--accent)' },
                ].map((s) => (
                  <div key={s.label} className="glass p-[20px] glass-hover">
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
            )}
          </div>

          <div className="glass p-[26px]">
            <SectionHeader id="charts" label="Distribucion por piso" icon="barChart" />
            {sections.charts && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px] mt-3">
                <PieChartCard data={pieData} />
                <ConsumoVecinosChart data={vecinosConsumo} />
              </div>
            )}
          </div>

          <div className="glass p-[26px]">
            <SectionHeader id="historico" label="Historico global" icon="activity" />
            {sections.historico && (
              <div className="mt-3">
                <HistoricoCharts endpoint="/admin/aerotermia/consumos" title="Historico — Global" desde={desde} hasta={hasta} />
              </div>
            )}
          </div>

          <div className="glass p-[26px]">
            <SectionHeader id="facturas" label="Facturas" icon="dollar" />
            {sections.facturas && (
              <div className="mt-3 space-y-[22px]">
                <FacturasChart
                  data={facturasGlobal}
                  headerRight={
                    <select value={pisoFacturas} onChange={(e) => setPisoFacturas(e.target.value)} className="input-card text-xs py-2 px-3 min-w-[140px]">
                      <option value="">Todos los pisos</option>
                      {pisosUnicos.map((p) => <option key={p} value={p}>Piso {p}</option>)}
                    </select>
                  }
                />
                <div className="glass p-[26px]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff8ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    </div>
                    <span className="eyebrow">Dashboards de vecinos</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {pisosUnicos.map((p) => (
                      <Link
                        key={p}
                        to={`/aerotermia?piso=${p}`}
                        className="group relative flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl bg-cream/30 hover:bg-cream/60 border border-cocoa/6 hover:border-accent/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
                      >
                        <span className="font-display text-[28px] font-medium text-cocoa group-hover:text-accent transition-colors leading-none" style={{ letterSpacing: '-0.02em' }}>
                          {p}
                        </span>
                        <span className="text-[10px] font-medium uppercase tracking-wider text-cocoa/30 group-hover:text-cocoa/50 transition-colors">
                          ver datos
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="glass p-[26px]">
            <SectionHeader id="cop" label="COP y factura electrica" icon="zap" />
            {sections.cop && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px] mt-3">
                <CopChart data={filteredCopData} />
                <FacturaElectricaTable data={filteredCopData} />
              </div>
            )}
          </div>

          <div className="glass p-[26px]">
            <SectionHeader id="heatmap" label="Heatmap de consumo" icon="flame" />
            {sections.heatmap && (
              <div className="mt-3">
                <HeatmapChart data={heatmapData} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
