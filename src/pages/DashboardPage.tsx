import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { apiFetch } from '../api/client';
import { greeting } from '../lib/format';

import ConsumoCard from '../components/ConsumoCard';
import HistoricoCharts from '../components/HistoricoCharts';
import FacturasChart from '../components/FacturasChart';
import FacturasTable from '../components/FacturasTable';
import Icon from '../components/Icon';
import { toDatetimeLocal, fromDatetimeLocal, applyPreset, Preset } from '../lib/dates';

interface Consumo {
  timestamp: string;
  kwh_calor: number;
  kwh_frio: number;
  m3_acs: number;
  kwh_acs: number;
  kwh_calor_abs: number;
  kwh_frio_abs: number;
  m3_acs_abs: number;
  kwh_calor_mes_inicio: number | null;
  kwh_frio_mes_inicio: number | null;
  m3_acs_mes_inicio: number | null;
  temp_impulsion: number | null;
  temp_retorno: number | null;
  power_w: number | null;
}

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

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [consumoActual, setConsumoActual] = useState<Consumo | null>(null);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);

  const [showHA, setShowHA] = useState(false);
  const pisoParam = searchParams.get('piso');
  const viewingAs = user?.is_admin && pisoParam ? pisoParam : null;

  const [preset, setPreset] = useState<Preset | null>('1a');
  const [desdeInput, setDesdeInput] = useState(() => toDatetimeLocal(applyPreset('1a').desde));
  const [hastaInput, setHastaInput] = useState(() => toDatetimeLocal(applyPreset('1a').hasta));

  const { saludo } = greeting();
  const nombre = viewingAs ? `Piso ${viewingAs}` : (user?.vecino_piso || user?.email?.split('@')[0] || 'vecino');

  const setRange = (p: string) => {
    setPreset(p as Preset);
    if (p) {
      const { desde, hasta } = applyPreset(p as Preset);
      setDesdeInput(toDatetimeLocal(desde));
      setHastaInput(toDatetimeLocal(hasta));
    }
  };

  const desde = desdeInput ? fromDatetimeLocal(desdeInput) : '';
  const hasta = hastaInput ? fromDatetimeLocal(hastaInput) : '';

  useEffect(() => {
    async function fetchData() {
      try {
        const pisoQs = viewingAs ? `?piso=${encodeURIComponent(viewingAs)}` : '';
        const facturasEndpoint = viewingAs
          ? `/admin/vecinos/${viewingAs}/facturas`
          : '/facturas';
        const [actual, facturasData] = await Promise.all([
          apiFetch<Consumo | null>(`/consumo-actual${pisoQs}`),
          apiFetch<Factura[]>(facturasEndpoint),
        ]);
        setConsumoActual(actual);
        setFacturas(facturasData);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [viewingAs]);

  const filteredFacturas = useMemo(() => {
    if (!desde || !hasta) return facturas;
    const desdeD = new Date(desde).getTime();
    const hastaD = new Date(hasta).getTime();
    return facturas.filter((f) => {
      const t = new Date(f.periodo).getTime();
      return t >= desdeD && t <= hastaD;
    });
  }, [facturas, desde, hasta]);

  if (loading) {
    return (
      <div>
        <main className="max-w-[1180px] mx-auto px-6 flex items-center justify-center min-h-[60vh]">
          <div className="text-cocoa/40 text-sm">Cargando tus datos...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-in">
      <main className="max-w-[1180px] mx-auto px-6 flex flex-col gap-[22px] pb-10">
        <div>
          <p className="eyebrow">{viewingAs ? 'Vista admin' : 'Servicios'}</p>
          {viewingAs && (
            <Link to="/admin/aerotermia" className="btn btn-ghost text-xs mb-2 inline-flex items-center gap-1">
              <Icon name="chevronLeft" size={14} />
              Volver a Aerotermia Admin
            </Link>
          )}
          <h1 className="font-display text-[38px] font-medium text-cocoa mt-1" style={{ letterSpacing: '-0.02em' }}>
            {saludo}, {nombre}.
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 glass p-[26px]">
          <span className="eyebrow shrink-0">Periodo</span>
          <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Presets de periodo">
            {[{ key: '24h', label: '24h' }, { key: '7d', label: '7 dias' }, { key: '30d', label: '30 dias' }, { key: '3m', label: '3 meses' }, { key: '1a', label: '1 año' }].map((p) => (
              <button
                key={p.key}
                aria-pressed={preset === p.key}
                onClick={() => setRange(p.key)}
                className={`text-[11px] font-medium uppercase tracking-[0.05em] px-2.5 py-1.5 rounded-md transition-colors ${preset === p.key ? 'text-cocoa bg-accent/12' : 'text-cocoa/40 hover:text-cocoa'}`}
              >{p.label}</button>
            ))}
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
          <ConsumoCard data={consumoActual} />
          <HistoricoCharts
            endpoint={viewingAs ? `/admin/vecinos/${viewingAs}` : undefined}
            title={viewingAs ? `Histórico — Piso ${viewingAs}` : undefined}
            desde={desde}
            hasta={hasta}
          />
          <div id="facturas" className="scroll-mt-20">
            <FacturasChart data={filteredFacturas} />
          </div>
          <FacturasTable data={filteredFacturas} />

          <div className="glass p-[26px]">
            <button
              onClick={() => setShowHA(!showHA)}
              className="flex items-center justify-between w-full text-left bg-transparent border-none cursor-pointer p-0"
            >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#1abcfe]/10 flex items-center justify-center overflow-hidden">
                <img src="/images/home-assistant-icon.png" alt="Home Assistant" className="w-6 h-6" />
              </div>
              <div>
                <p className="eyebrow">Home Assistant</p>
                <h3 className="font-display text-[22px] font-medium text-cocoa">Integración oficial para tu hogar</h3>
              </div>
            </div>
            <Icon name={showHA ? 'chevronUp' : 'chevronDown'} size={18} className="text-cocoa/40 shrink-0" />
          </button>

          {showHA && (
            <div className="mt-5 pt-5 border-t border-cocoa/6">
              <p className="text-cocoa/70 text-sm leading-relaxed mb-4">
                Lleva los datos de tu aerotermia a Home Assistant para automatizar tu casa. La integración{' '}
                <strong>Elite Climate</strong> expone los consumos de calefacción, refrigeración, ACS, temperaturas
                y potencia en tiempo real como entidades en Home Assistant.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="https://github.com/EdificioElite/elite-home-assistant"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[13px] font-medium text-cocoa/60 hover:text-cocoa transition-colors px-3 py-2 rounded-md hover:bg-accent/5"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                  </svg>
                  Ver en GitHub
                </a>

                <a
                  href="https://my.home-assistant.io/redirect/hacs_repository/?owner=EdificioElite&repository=elite-home-assistant&category=integration"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[13px] font-medium text-white bg-[#1abcfe] hover:bg-[#18a8e4] transition-colors px-4 py-2.5 rounded-lg shadow-sm"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22c-5.523 0-10-4.477-10-10S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-2-14h4v2h-4V8zm0 4h4v6h-4v-6z"/>
                  </svg>
                  Añadir a Home Assistant
                </a>
              </div>

              <p className="text-cocoa/30 text-[11px] mt-4">
                Requiere Home Assistant 2024.1 o superior y HACS instalado.
              </p>
            </div>
          )}
          </div>
        </div>
      </main>
    </div>
  );
}
