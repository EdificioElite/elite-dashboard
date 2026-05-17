import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import Header from '../components/Header';
import Icon from '../components/Icon';
import HistoricoCharts from '../components/HistoricoCharts';
import FacturasTable from '../components/FacturasTable';

interface Consumo {
  timestamp: string;
  kwh_calor: number;
  kwh_frio: number;
  m3_acs: number;
  kwh_acs: number;
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
  importe_acs: number;
}

export default function AdminVecinoPage() {
  const { piso } = useParams<{ piso: string }>();
  const navigate = useNavigate();
  const [consumoActual, setConsumoActual] = useState<Consumo | null>(null);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [actual, facturasData] = await Promise.all([
          apiFetch<Consumo | null>(`/admin/vecinos/${piso}`),
          apiFetch<Factura[]>(`/admin/vecinos/${piso}/facturas`),
        ]);
        setConsumoActual(actual);
        setFacturas(facturasData);
      } catch (err) {
        console.error('Error fetching vecino data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [piso]);

  const todayKwh =
    consumoActual
      ? Number(consumoActual.kwh_calor) + Number(consumoActual.kwh_frio) + Number(consumoActual.kwh_acs)
      : 0;
  const weeklyKwh = facturas.length > 0 ? Math.round((todayKwh * 7) * 10) / 10 : todayKwh;
  const monthlyKwh = facturas.length > 0 ? Math.round((todayKwh * 30) * 10) / 10 : todayKwh;
  const lastInvoice = facturas.length > 0 ? facturas[0].importe_total : 0;

  const stats = [
    { label: 'Hoy', value: todayKwh, unit: 'kWh', icon: 'clock', iconColor: 'var(--accent)' },
    { label: 'Semana (est.)', value: weeklyKwh, unit: 'kWh', icon: 'calendar', iconColor: 'var(--sage)' },
    { label: 'Mes (est.)', value: monthlyKwh, unit: 'kWh', icon: 'calendar', iconColor: 'var(--accent-dark)' },
    { label: 'Ultima factura', value: lastInvoice, unit: '', icon: 'dollar', iconColor: 'var(--sage-dark)' },
  ];

  if (loading) {
    return (
      <div>
        <Header />
        <main className="max-w-[1180px] mx-auto px-6 flex items-center justify-center min-h-[60vh]">
          <div className="text-cocoa/40 text-sm">Cargando datos del vecino...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-in">
      <Header />

      <main className="max-w-[1180px] mx-auto px-6 flex flex-col gap-[22px] pb-10">
        {/* Back + Greeting */}
        <div className="pt-2">
          <button onClick={() => navigate('/admin')} className="btn btn-ghost text-xs mb-3">
            <Icon name="chevronLeft" size={14} />
            Volver a vecinos
          </button>
          <p className="eyebrow">Vecino</p>
          <h1
            className="font-display text-[40px] font-medium text-cocoa mt-1"
            style={{ letterSpacing: '-0.02em' }}
          >
            Piso {piso}
          </h1>
          <p className="text-sm text-cocoa/60 mt-1.5 max-w-lg">
            Resumen de consumo del vecino {piso}. Datos en tiempo real.
          </p>
        </div>

        <div className="stagger flex flex-col gap-[22px]">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-[16px]">
            {stats.map((s) => (
              <div key={s.label} className="glass p-[20px]">
                <div className="flex items-center gap-2.5 mb-2">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: s.iconColor }}
                  >
                    <Icon name={s.icon} size={12} className="text-cream" />
                  </div>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-cocoa/40">{s.label}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span
                    className="font-display text-[32px] font-medium leading-none text-cocoa"
                    style={{ letterSpacing: '-0.02em' }}
                  >
                    {typeof s.value === 'number'
                      ? s.unit === ''
                        ? s.value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
                        : s.value.toFixed(1)
                      : s.value}
                  </span>
                  {s.unit && <span className="font-mono text-[11px] text-cocoa/40 font-num">{s.unit}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <HistoricoCharts endpoint={`/admin/vecinos/${piso}`} title={`Historico — Piso ${piso}`} />

          {/* Facturas */}
          <FacturasTable data={facturas} />
        </div>
      </main>
    </div>
  );
}
