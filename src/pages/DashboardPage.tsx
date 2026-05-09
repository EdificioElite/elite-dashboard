import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { apiFetch } from '../api/client';
import ConsumoCard from '../components/ConsumoCard';
import ConsumoChart from '../components/ConsumoChart';
import FacturasTable from '../components/FacturasTable';

interface Consumo {
  timestamp: string;
  kwh_electrico: number;
  kwh_acs: number;
}

interface Factura {
  id: number;
  periodo: string;
  importe: number;
  kwh_electrico: number;
  kwh_acs: number;
}

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [consumoActual, setConsumoActual] = useState<Consumo | null>(null);
  const [consumos, setConsumos] = useState<Consumo[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [actual, historico, facturasData] = await Promise.all([
          apiFetch<Consumo | null>('/consumo-actual'),
          apiFetch<Consumo[]>('/consumos'),
          apiFetch<Factura[]>('/facturas'),
        ]);
        setConsumoActual(actual);
        setConsumos(historico);
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
        <ConsumoChart data={consumos} />
        <FacturasTable data={facturas} />
      </main>
    </div>
  );
}
