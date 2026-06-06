import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import Icon from '../components/Icon';
import HistoricoCharts from '../components/HistoricoCharts';
import CopChart from '../components/CopChart';
import FacturaElectricaTable from '../components/FacturaElectricaTable';
import HeatmapChart from '../components/HeatmapChart';
import { toDatetimeLocal, fromDatetimeLocal, applyPreset, Preset } from '../lib/dates';
import DateRangeControls from '../components/DateRangeControls';
import GlobalEnVivoCard from '../components/GlobalEnVivoCard';

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

function formatPeriodo(periodo: string): string {
  if (!periodo) return '—';
  const d = new Date(periodo);
  return d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
}

function SectionHeader({ id, label, icon, expanded, onToggle }: {
  id: string;
  label: string;
  icon: string;
  expanded: boolean;
  onToggle: (key: string) => void;
}) {
  return (
    <button
      onClick={() => onToggle(id)}
      className="flex items-center gap-3 w-full text-left py-3"
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-2)' }}>
        <Icon name={icon} size={14} className="text-cream" />
      </div>
      <span className="eyebrow flex-1">{label}</span>
      <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={16} className="text-cocoa/30" />
    </button>
  );
}

export default function AdminAerotermiaPage() {
  const [facturas, setFacturas] = useState<FacturaGlobal[]>([]);
  const [copData, setCopData] = useState<CopDatum[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<Preset | null>('3m');
  const [desdeInput, setDesdeInput] = useState(() => toDatetimeLocal(applyPreset('3m').desde));
  const [hastaInput, setHastaInput] = useState(() => toDatetimeLocal(applyPreset('3m').hasta));

  const [sections, setSections] = useState<Record<string, boolean>>({
    historico: true,
    facturas: true,
    cop: true,
    heatmap: false,
  });

  const [searchVecino, setSearchVecino] = useState('');

  const toggleSection = (key: string) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const desde = desdeInput ? fromDatetimeLocal(desdeInput) : '';
  const hasta = hastaInput ? fromDatetimeLocal(hastaInput) : '';

  useEffect(() => {
    Promise.all([
      apiFetch<FacturaGlobal[]>('/admin/aerotermia/facturas').catch(() => []),
      apiFetch<CopDatum[]>('/admin/aerotermia/cop').catch(() => []),
    ]).then(([f, c]) => {
      setFacturas(f);
      setCopData(c);
      setLoading(false);
    });
  }, []);

  const filteredFacturas = useMemo(() => {
    if (!desde || !hasta) return facturas;
    const desdeD = new Date(desde).getTime();
    const hastaD = new Date(hasta).getTime();
    return facturas.filter((f) => {
      const t = new Date(f.periodo).getTime();
      return t >= desdeD && t <= hastaD;
    });
  }, [facturas, desde, hasta]);

  const pisosUnicos = useMemo(() => {
    return [...new Set(facturas.map((f) => f.piso))].sort();
  }, [facturas]);

  const pisosFiltrados = useMemo(() => {
    if (!searchVecino.trim()) return pisosUnicos;
    const q = searchVecino.toLowerCase();
    return pisosUnicos.filter((p) => p.toLowerCase().includes(q));
  }, [pisosUnicos, searchVecino]);

  // Tabla pivote de facturas
  const periodosUnicos = useMemo(() => {
    const set = new Set<string>();
    filteredFacturas.forEach((f) => set.add(f.periodo));
    return [...set].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [filteredFacturas]);

  const facturasPivote = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    filteredFacturas.forEach((f) => {
      if (!map.has(f.piso)) map.set(f.piso, {});
      map.get(f.piso)![f.periodo] = Number(f.importe_total);
    });
    return map;
  }, [filteredFacturas]);

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

  const filteredCopData = useMemo(() => {
    if (!desde || !hasta) return copData;
    const desdeD = new Date(desde).getTime();
    const hastaD = new Date(hasta).getTime();
    return copData.filter((c) => {
      const t = new Date(c.startdate).getTime();
      return t >= desdeD && t <= hastaD;
    });
  }, [copData, desde, hasta]);

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
          <p className="eyebrow">Panel de administración</p>
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

        <div className="flex flex-col gap-[22px]">
          {/* 1. Global en Vivo */}
          <GlobalEnVivoCard />

          {/* 2. Dashboards de vecinos */}
          <div className="glass p-[26px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
                <Icon name="users" size={14} className="text-cream" />
              </div>
              <span className="eyebrow">Dashboards de vecinos</span>
            </div>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Buscar piso..."
                value={searchVecino}
                onChange={(e) => setSearchVecino(e.target.value)}
                className="input-card text-xs py-2 px-3 w-full max-w-[220px]"
              />
            </div>
            {pisosFiltrados.length === 0 ? (
              <p className="text-sm text-cocoa/40">Sin resultados</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {pisosFiltrados.map((p) => (
                  <Link
                    key={p}
                    to={`/aerotermia?piso=${p}`}
                    className="text-center py-2 px-1 rounded-lg border border-cocoa/6 bg-cream/30 hover:bg-accent/5 hover:border-accent/25 hover:-translate-y-px hover:shadow-sm transition-all duration-200"
                  >
                    <span className="text-sm font-semibold text-cocoa">{p}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 3. DateRangeControls */}
          <DateRangeControls
            preset={preset}
            desdeInput={desdeInput}
            hastaInput={hastaInput}
            onPresetChange={(p) => {
              setPreset(p);
              const { desde, hasta } = applyPreset(p as Preset);
              setDesdeInput(toDatetimeLocal(desde));
              setHastaInput(toDatetimeLocal(hasta));
            }}
            onCustomApply={(d, h) => {
              setDesdeInput(d);
              setHastaInput(h);
              setPreset(null);
            }}
          />

          <div className="stagger flex flex-col gap-[22px]">
            {/* 4. Histórico global */}
            <div className="glass p-[26px]">
              <SectionHeader id="historico" label="Histórico global" icon="activity" expanded={sections.historico} onToggle={toggleSection} />
              {sections.historico && (
                <div className="mt-3">
                  <HistoricoCharts endpoint="/admin/aerotermia/consumos" title="Histórico — Global" desde={desde} hasta={hasta} />
                </div>
              )}
            </div>

            {/* 5. Facturas — Tabla pivote */}
            <div className="glass p-[26px]">
              <SectionHeader id="facturas" label="Facturas" icon="dollar" expanded={sections.facturas} onToggle={toggleSection} />
              {sections.facturas && (
                <div className="mt-3 overflow-x-auto">
                  {periodosUnicos.length === 0 ? (
                    <p className="text-sm text-cocoa/40 py-8">No hay facturas en este periodo</p>
                  ) : (
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr>
                          <th className="text-left py-2 px-3 font-medium uppercase tracking-wider text-cocoa/40 sticky left-0 z-10" style={{ minWidth: '60px', background: 'rgba(255,251,245,0.95)' }}>Piso</th>
                          {periodosUnicos.map((p) => (
                            <th key={p} className="text-right py-2 px-3 font-medium uppercase tracking-wider text-cocoa/40" style={{ minWidth: '70px' }}>
                              {formatPeriodo(p)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pisosUnicos.map((piso) => (
                          <tr key={piso} className="border-t border-cocoa/5">
                            <td className="py-2 px-3 font-semibold text-cocoa sticky left-0" style={{ background: 'rgba(255,251,245,0.95)' }}>{piso}</td>
                            {periodosUnicos.map((periodo) => {
                              const importe = facturasPivote.get(piso)?.[periodo];
                              return (
                                <td key={periodo} className="py-2 px-3 text-right font-mono font-num text-cocoa/70">
                                  {importe != null ? `${importe.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : '—'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>

            {/* 6. COP y factura electrica */}
            <div className="glass p-[26px]">
              <SectionHeader id="cop" label="COP y factura electrica" icon="zap" expanded={sections.cop} onToggle={toggleSection} />
              {sections.cop && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px] mt-3">
                  <CopChart data={filteredCopData} />
                  <FacturaElectricaTable data={filteredCopData} />
                </div>
              )}
            </div>

            {/* 7. Heatmap */}
            <div className="glass p-[26px]">
              <SectionHeader id="heatmap" label="Heatmap de consumo" icon="flame" expanded={sections.heatmap} onToggle={toggleSection} />
              {sections.heatmap && (
                <div className="mt-3">
                  <HeatmapChart data={heatmapData} />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
