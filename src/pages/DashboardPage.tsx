import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { apiFetch } from '../api/client';
import ConsumoCard from '../components/ConsumoCard';
import ConsumoChart from '../components/ConsumoChart';
import FacturasTable from '../components/FacturasTable';

export interface Consumo {
  timestamp: string;
  kwh_calor: number;
  kwh_frio: number;
  m3_acs: number;
  kwh_acs: number;
  temp_impulsion: number | null;
  temp_retorno: number | null;
  power_w: number | null;
}

export interface Factura {
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
  fecha_factura_inicio: string;
  fecha_factura_fin: string;
}

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [consumoActual, setConsumoActual] = useState<Consumo | null>(null);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Elite Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.email}</span>
          {user?.is_admin && (
            <button
              onClick={() => navigate('/admin')}
              className="text-sm text-blue-600 hover:underline"
            >
              Admin
            </button>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 hover:underline"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        <ConsumoCard data={consumoActual} />
        <ConsumoChart />
        <FacturasTable data={facturas} />
      </main>
    </div>
  );
}
