import { useEffect, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';

interface Vecino {
  id: number;
  nombre: string;
  piso: string;
  email: string | null;
  is_admin: boolean;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [vecinos, setVecinos] = useState<Vecino[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [vecinoId, setVecinoId] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  useEffect(() => {
    apiFetch<Vecino[]>('/admin/vecinos')
      .then(setVecinos)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    try {
      await apiFetch('/admin/usuarios', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          vecino_id: parseInt(vecinoId, 10),
        }),
      });
      setFormSuccess('Usuario creado correctamente');
      setEmail('');
      setPassword('');
      setVecinoId('');
      setShowForm(false);
      const updated = await apiFetch<Vecino[]>('/admin/vecinos');
      setVecinos(updated);
    } catch (err: any) {
      setFormError(err.message || 'Error al crear usuario');
    }
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
        <div>
          <h1 className="text-xl font-bold text-gray-800">Panel de Administracion</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-blue-600 hover:underline"
          >
            Ver mi dashboard
          </button>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="text-sm text-red-600 hover:underline"
        >
          Salir
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Vecinos</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            {showForm ? 'Cancelar' : 'Crear usuario'}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleCreateUser}
            className="bg-white p-6 rounded-lg shadow-md space-y-4"
          >
            {formError && (
              <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{formError}</div>
            )}
            {formSuccess && (
              <div className="p-3 bg-green-100 text-green-700 rounded text-sm">{formSuccess}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vecino ID
              </label>
              <input
                type="number"
                value={vecinoId}
                onChange={(e) => setVecinoId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contrasena
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            >
              Guardar
            </button>
          </form>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Piso</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Accion</th>
              </tr>
            </thead>
            <tbody>
              {vecinos.map((v) => (
                <tr key={v.id} className="border-b">
                  <td className="px-4 py-3 text-gray-500">{v.id}</td>
                  <td className="px-4 py-3 font-medium">{v.piso}</td>
                  <td className="px-4 py-3">{v.email || 'Sin usuario'}</td>
                  <td className="px-4 py-3">
                    {v.is_admin ? (
                      <span className="text-green-600">Si</span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/admin/vecino/${v.id}`)}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      Ver consumos
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
