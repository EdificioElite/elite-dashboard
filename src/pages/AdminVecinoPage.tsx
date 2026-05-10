import { useParams, useNavigate } from 'react-router-dom';
import ConsumoChart from '../components/ConsumoChart';

export default function AdminVecinoPage() {
  const { piso } = useParams<{ piso: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm p-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/admin')}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Volver
        </button>
        <h1 className="text-xl font-bold text-gray-800">Consumos vecino {piso}</h1>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        <ConsumoChart endpoint={`/admin/vecinos/${piso}`} />
      </main>
    </div>
  );
}
