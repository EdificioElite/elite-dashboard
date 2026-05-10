import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import ConsumoChart from '../components/ConsumoChart';

interface Consumo {
  timestamp: string;
  kwh_calor: number;
  kwh_frio: number;
  m3_acs: number;
  kwh_acs: number;
}

export default function AdminVecinoPage() {
  const { piso } = useParams<{ piso: string }>();
  const navigate = useNavigate();
  const [consumos, setConsumos] = useState<Consumo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Consumo[]>(`/admin/vecinos/${piso}`)
      .then(setConsumos)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [piso]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm p-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/admin')}
          className="text-sm text-blue-600 hover:underline"
        >
          Volver
        </button>
        <h1 className="text-xl font-bold text-gray-800">Consumos vecino {piso}</h1>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        <ConsumoChart data={consumos} />
      </main>
    </div>
  );
}
