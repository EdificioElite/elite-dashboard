import { useEffect, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuthStore } from '../store/auth';
import Header from '../components/Header';
import Icon from '../components/Icon';
import EditUserModal from '../components/EditUserModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import DeleteUserModal from '../components/DeleteUserModal';

interface Vecino {
  piso: string;
  nombre: string;
  user_id: number | null;
  email: string | null;
  is_admin: boolean;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [vecinos, setVecinos] = useState<Vecino[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [vecinoPiso, setVecinoPiso] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const [editingVecino, setEditingVecino] = useState<Vecino | null>(null);
  const [changingPassword, setChangingPassword] = useState<Vecino | null>(null);
  const [deletingVecino, setDeletingVecino] = useState<Vecino | null>(null);

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
        body: JSON.stringify({ email, password, vecino_piso: vecinoPiso }),
      });
      setFormSuccess('Usuario creado correctamente');
      setEmail('');
      setPassword('');
      setVecinoPiso('');
      setShowForm(false);
      const updated = await apiFetch<Vecino[]>('/admin/vecinos');
      setVecinos(updated);
    } catch (err: any) {
      setFormError(err.message || 'Error al crear usuario');
    }
  };

  const filtered = vecinos.filter(
    (v) =>
      v.piso.toLowerCase().includes(search.toLowerCase()) ||
      (v.nombre && v.nombre.toLowerCase().includes(search.toLowerCase())) ||
      (v.email && v.email.toLowerCase().includes(search.toLowerCase()))
  );

  const stats = [
    { label: 'Vecinos', value: vecinos.length, unit: '', icon: 'users', iconColor: 'var(--accent)' },
    { label: 'Con acceso', value: vecinos.filter((v) => v.email).length, unit: '', icon: 'check', iconColor: 'var(--sage)' },
    { label: 'Sin acceso', value: vecinos.filter((v) => !v.email).length, unit: '', icon: 'x', iconColor: 'var(--rise)' },
    { label: 'Admins', value: vecinos.filter((v) => v.is_admin).length, unit: '', icon: 'settings', iconColor: 'var(--accent-2)' },
  ];

  if (loading) {
    return (
      <div>
        <Header showDashboard />
        <main className="max-w-[1180px] mx-auto px-6 flex items-center justify-center min-h-[60vh]">
          <div className="text-cocoa/40 text-sm">Cargando vecinos...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-in">
      <Header showDashboard />

      <main className="max-w-[1180px] mx-auto px-6 flex flex-col gap-[22px] pb-10">
        {/* Greeting */}
        <div className="pt-2 flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="eyebrow">Panel de administracion</p>
            <h1
              className="font-display text-[40px] font-medium text-cocoa mt-1"
              style={{ letterSpacing: '-0.02em' }}
            >
              Vecinos
            </h1>
            <p className="text-sm text-cocoa/60 mt-1.5 max-w-lg">
              Gestiona los accesos y consulta el consumo de cada vecino.
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`btn ${showForm ? 'btn-ghost' : 'btn-primary'}`}
          >
            <Icon name={showForm ? 'x' : 'plus'} size={14} />
            {showForm ? 'Cancelar' : 'Crear acceso'}
          </button>
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
                <span
                  className="font-display text-[32px] font-medium leading-none text-cocoa"
                  style={{ letterSpacing: '-0.02em' }}
                >
                  {s.value}
                </span>
              </div>
            ))}
          </div>

          {/* Create form */}
          {showForm && (
            <div className="glass p-[26px]">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
                  <Icon name="plus" size={14} className="text-cream" />
                </div>
                <span className="eyebrow">Nuevo acceso</span>
              </div>

              {formError && (
                <div
                  className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                  style={{ background: 'rgba(163,64,42,.08)', color: '#a3402a' }}
                >
                  <Icon name="alertTriangle" size={14} />
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div
                  className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                  style={{ background: 'rgba(91,122,74,.1)', color: '#5b7a4a' }}
                >
                  <Icon name="check" size={14} />
                  {formSuccess}
                </div>
              )}

              <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label htmlFor="vecinoPiso" className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">
                    Piso
                  </label>
                  <input
                    id="vecinoPiso"
                    type="text"
                    value={vecinoPiso}
                    onChange={(e) => setVecinoPiso(e.target.value)}
                    required
                    className="input-card"
                    placeholder="1A"
                  />
                </div>
                <div>
                  <label htmlFor="adminEmail" className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">
                    Email
                  </label>
                  <input
                    id="adminEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="input-card"
                    placeholder="vecino@email.com"
                  />
                </div>
                <div>
                  <label htmlFor="adminPassword" className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">
                    Contrasena
                  </label>
                  <input
                    id="adminPassword"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="input-card"
                    placeholder="••••••••"
                  />
                </div>
                <div className="md:col-span-3 flex justify-end">
                  <button type="submit" className="btn btn-primary">
                    <Icon name="check" size={14} />
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Table */}
          <div className="glass p-[26px]">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-2)' }}>
                <Icon name="users" size={14} className="text-cream" />
              </div>
              <span className="eyebrow">Listado</span>

              <div className="ml-auto flex items-center gap-2">
                <Icon name="search" size={14} className="text-cocoa/30" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar vecino..."
                  className="bg-transparent border-none text-sm text-cocoa placeholder-cocoa/25 outline-none w-40"
                />
              </div>
            </div>

            <div className="overflow-x-auto -mx-2">
              <table className="table-glass">
                <thead>
                  <tr>
                    <th>Piso</th>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Admin</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v, i) => (
                    <tr key={v.piso} className="row-stagger" style={{ animationDelay: `${i * 40}ms` }}>
                      <td className="font-medium text-cocoa">
                        <button onClick={() => navigate(`/admin/vecino/${v.piso}`)} className="hover:text-accent transition-colors text-left">
                          {v.piso}
                        </button>
                      </td>
                      <td className="text-cocoa/60">{v.nombre}</td>
                      <td className="text-sm text-cocoa/50">{v.email || '—'}</td>
                      <td>
                        {v.is_admin ? (
                          <span className="chip chip-accent">Admin</span>
                        ) : (
                          <span className="chip">Vecino</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          {v.email ? (
                            <>
                              <button
                                onClick={() => setEditingVecino(v)}
                                className="btn btn-ghost p-2 text-cocoa/40 hover:text-cocoa"
                                title="Editar usuario"
                              >
                                <Icon name="edit" size={15} />
                              </button>
                              <button
                                onClick={() => setChangingPassword(v)}
                                className="btn btn-ghost p-2 text-cocoa/40 hover:text-cocoa"
                                title="Cambiar contrasena"
                              >
                                <Icon name="key" size={15} />
                              </button>
                              {v.user_id !== user?.id && (
                                <button
                                  onClick={() => setDeletingVecino(v)}
                                  className="btn btn-ghost p-2 text-cocoa/40 hover:text-red-600"
                                  title="Eliminar usuario"
                                >
                                  <Icon name="trash" size={15} />
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-[11px] text-cocoa/25">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-sm text-cocoa/40 py-8 text-center">
                  No se encontraron vecinos
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {editingVecino && (
        <EditUserModal
          vecino={editingVecino}
          vecinos={vecinos}
          currentUserId={user?.id || 0}
          onClose={() => setEditingVecino(null)}
          onSaved={() => {
            setEditingVecino(null);
            apiFetch<Vecino[]>('/admin/vecinos').then(setVecinos).catch(console.error);
          }}
        />
      )}

      {changingPassword && (
        <ChangePasswordModal
          userId={changingPassword.user_id!}
          userName={`${changingPassword.nombre} — Piso ${changingPassword.piso}`}
          onClose={() => setChangingPassword(null)}
          onSaved={() => setChangingPassword(null)}
        />
      )}

      {deletingVecino && (
        <DeleteUserModal
          userId={deletingVecino.user_id!}
          userName={`${deletingVecino.nombre} — Piso ${deletingVecino.piso}`}
          onClose={() => setDeletingVecino(null)}
          onDeleted={() => {
            setDeletingVecino(null);
            apiFetch<Vecino[]>('/admin/vecinos').then(setVecinos).catch(console.error);
          }}
        />
      )}
    </div>
  );
}
