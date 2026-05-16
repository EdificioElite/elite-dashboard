import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { apiFetch } from '../api/client';
import { greeting } from '../lib/format';
import Header from '../components/Header';
import ConsumoCard from '../components/ConsumoCard';
import HistoricoCharts from '../components/HistoricoCharts';
import FacturasChart from '../components/FacturasChart';
import FacturasTable from '../components/FacturasTable';

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
  kwh_calor: number;
  kwh_frio: number;
  kwh_acs: number;
  m3_acs: number;
  importe_calor: number;
  importe_frio: number;
  importe_acs: number;
}

const SECTION_NAV = [
  { label: 'En vivo', target: 'envivo' },
  { label: 'Calefacción', target: 'calor' },
  { label: 'Refrigeración', target: 'frio' },
  { label: 'ACS', target: 'acs' },
  { label: 'Facturas', target: 'facturas' },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [consumoActual, setConsumoActual] = useState<Consumo | null>(null);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);

  const { saludo } = greeting();
  const nombre = user?.vecino_piso || user?.email?.split('@')[0] || 'vecino';

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const [actual, facturasData] = await Promise.all([
          apiFetch<Consumo | null>('/consumo-actual'),
          apiFetch<Factura[]>('/facturas'),
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
  }, []);

  if (loading) {
    return (
      <div>
        <Header />
        <main className="max-w-[1180px] mx-auto px-6 flex items-center justify-center min-h-[60vh]">
          <div className="text-cocoa/40 text-sm">Cargando tus datos...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-in">
      <Header />

      <main className="max-w-[1180px] mx-auto px-6 flex flex-col gap-[22px] pb-10">
        <div className="pt-2">
          <p className="eyebrow">Servicios</p>
          <h1 className="font-display text-[40px] font-medium text-cocoa mt-1" style={{ letterSpacing: '-0.02em' }}>
            {saludo}, {nombre}.
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {SECTION_NAV.map((item) => (
            <button
              key={item.target}
              onClick={() => scrollTo(item.target)}
              className="text-[11px] font-medium uppercase tracking-[0.05em] text-cocoa/40 hover:text-cocoa hover:bg-accent/8 px-2.5 py-1.5 rounded-md transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="stagger flex flex-col gap-[22px]">
          <ConsumoCard data={consumoActual} />
          <HistoricoCharts />
          <div id="facturas" className="scroll-mt-20">
            <FacturasChart data={facturas} />
          </div>
          <FacturasTable data={facturas} />

          <section className="glass p-[26px] mt-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#1abcfe]/10 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#1abcfe]" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22c-5.523 0-10-4.477-10-10S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-2-14h4v2h-4V8zm0 4h4v6h-4v-6z"/>
                </svg>
              </div>
              <div>
                <p className="eyebrow">Home Assistant</p>
                <h3 className="font-display text-[22px] font-medium text-cocoa">Integración oficial para tu hogar</h3>
              </div>
            </div>

            <p className="text-cocoa/70 text-sm leading-relaxed mb-4">
              Lleva los datos de tu aerotermia a Home Assistant para automatizar tu casa. La integración{' '}
              <strong>Elite Climate</strong> expone los consumos de calefacción, refrigeración, ACS, temperaturas
              y potencia en tiempo real como entidades en Home Assistant, actualizándose cada 5 minutos.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="https://github.com/EdificioElite/elite-home-assistant"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[13px] font-medium text-cocoa/60 hover:text-cocoa transition-colors px-3 py-2 rounded-md hover:bg-accent/5"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
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
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22c-5.523 0-10-4.477-10-10S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-2-14h4v2h-4V8zm0 4h4v6h-4v-6z"/>
                </svg>
                Añadir a Home Assistant
              </a>
            </div>

            <p className="text-cocoa/30 text-[11px] mt-4">
              Requiere Home Assistant 2024.1 o superior y HACS instalado.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
