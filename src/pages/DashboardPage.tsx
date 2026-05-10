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

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [consumoActual, setConsumoActual] = useState<Consumo | null>(null);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);

  const { saludo } = greeting();
  const nombre = user?.vecino_piso || user?.email?.split('@')[0] || 'vecino';

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
        <Header showAdmin />
        <main className="max-w-[1180px] mx-auto px-6 flex items-center justify-center min-h-[60vh]">
          <div className="text-cocoa/40 text-sm">Cargando tus datos...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-in">
      <Header showAdmin />

      <main className="max-w-[1180px] mx-auto px-6 flex flex-col gap-[22px] pb-10">
        <div className="pt-2">
          <p className="eyebrow">Dashboard</p>
          <h1 className="font-display text-[40px] font-medium text-cocoa mt-1" style={{ letterSpacing: '-0.02em' }}>
            {saludo}, {nombre}.
          </h1>
        </div>

        <div className="stagger flex flex-col gap-[22px]">
          <ConsumoCard data={consumoActual} />
          <HistoricoCharts />
          <div id="facturas" className="scroll-mt-20">
            <FacturasChart data={facturas} />
          </div>
          <FacturasTable data={facturas} />
        </div>
      </main>
    </div>
  );
}
