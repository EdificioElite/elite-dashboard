import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { useAuthStore } from '../store/auth';
import Header from '../components/Header';
import Icon from '../components/Icon';
import EditUserModal from '../components/EditUserModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import DeleteUserModal from '../components/DeleteUserModal';

interface Usuario {
  id: number;
  vecino_piso: string | null;
  email: string;
  is_admin: boolean;
  created_at: string;
  ultima_conexion: string | null;
}

export default function UsuariosPage() {
  const user = useAuthStore(s => s.user);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [vecinoPiso, setVecinoPiso] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [changingPassword, setChangingPassword] = useState<Usuario | null>(null);
  const [deletingUser, setDeletingUser] = useState<Usuario | null>(null);

  const fetchUsuarios = () => {
    apiFetch<Usuario[]>('/admin/usuarios').then(setUsuarios).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsuarios(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    try {
      const body: Record<string, string> = { email, password };
      if (vecinoPiso) body.vecino_piso = vecinoPiso;
      await apiFetch('/admin/usuarios', { method: 'POST', body: JSON.stringify(body) });
      setFormSuccess('Usuario creado');
      setEmail(''); setPassword(''); setVecinoPiso('');
      setShowForm(false);
      fetchUsuarios();
    } catch (err: any) {
      setFormError(err.message || 'Error al crear usuario');
    }
  };

  const filtered = usuarios.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.vecino_piso && u.vecino_piso.toLowerCase().includes(search.toLowerCase()))
  );

  const formatUltimaConexion = (date: string | null) => {
    if (!date) return '—';
    return new Date(date).toLocaleString('es-ES', {
      timeZone: 'Europe/Madrid',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const stats = [
    { label: 'Usuarios', value: usuarios.length, icon: 'users', iconColor: 'var(--accent)' },
    { label: 'Admins', value: usuarios.filter(u => u.is_admin).length, icon: 'settings', iconColor: 'var(--accent-2)' },
    { label: 'Con piso', value: usuarios.filter(u => u.vecino_piso).length, icon: 'check', iconColor: 'var(--sage)' },
  ];

  if (loading) return <div><Header /><main className="max-w-[1180px] mx-auto px-6 flex items-center justify-center min-h-[60vh]"><div className="text-cocoa/40 text-sm">Cargando...</div></main></div>;

  return (
    <div className="page-in">
      <Header />

      <main className="max-w-[1180px] mx-auto px-6 flex flex-col gap-[22px] pb-10">
        <div className="pt-2 flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="eyebrow">Panel de administracion</p>
            <h1 className="font-display text-[40px] font-medium text-cocoa mt-1" style={{ letterSpacing: '-0.02em' }}>Usuarios</h1>
            <p className="text-sm text-cocoa/60 mt-1.5 max-w-lg">Gestiona los accesos al dashboard.</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className={`btn ${showForm ? 'btn-ghost' : 'btn-primary'}`}>
            <Icon name={showForm ? 'x' : 'plus'} size={14} />
            {showForm ? 'Cancelar' : 'Crear acceso'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-[16px]">
          {stats.map(s => (
            <div key={s.label} className="glass p-[20px]">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: s.iconColor }}>
                  <Icon name={s.icon} size={12} className="text-cream" />
                </div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-cocoa/40">{s.label}</span>
              </div>
              <span className="font-display text-[32px] font-medium leading-none text-cocoa" style={{ letterSpacing: '-0.02em' }}>{s.value}</span>
            </div>
          ))}
        </div>

        {showForm && (
          <div className="glass p-[26px]">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
                <Icon name="plus" size={14} className="text-cream" />
              </div>
              <span className="eyebrow">Nuevo acceso</span>
            </div>
            {formError && <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(163,64,42,.08)', color: '#a3402a' }}><Icon name="alertTriangle" size={14} />{formError}</div>}
            {formSuccess && <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(91,122,74,.1)', color: '#5b7a4a' }}><Icon name="check" size={14} />{formSuccess}</div>}
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Piso</label>
                <select value={vecinoPiso} onChange={e => setVecinoPiso(e.target.value)} className="input-card">
                  <option value="">Sin piso (usuario global)...</option>
                  {usuarios.map(u => u.vecino_piso && <option key={u.vecino_piso} value={u.vecino_piso}>{u.vecino_piso}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="input-card" placeholder="vecino@email.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Contrasena</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="input-card" placeholder="••••••••" />
              </div>
              <div className="md:col-span-3 flex justify-end">
                <button type="submit" className="btn btn-primary"><Icon name="check" size={14} />Guardar</button>
              </div>
            </form>
          </div>
        )}

        <div className="glass p-[26px]">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-2)' }}>
              <Icon name="users" size={14} className="text-cream" />
            </div>
            <span className="eyebrow">Listado</span>
            <div className="ml-auto flex items-center gap-2">
              <Icon name="search" size={14} className="text-cocoa/30" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar usuario..." className="bg-transparent border-none text-sm text-cocoa placeholder-cocoa/25 outline-none w-40" />
            </div>
          </div>

          <div className="overflow-x-auto -mx-2">
            <table className="table-glass">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Piso</th>
                  <th>Rol</th>
                  <th className="text-center">Ult. conexion</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr key={u.id} className="row-stagger" style={{ animationDelay: `${i * 40}ms` }}>
                    <td className="text-sm text-cocoa">{u.email}</td>
                    <td className="text-sm text-cocoa/60">{u.vecino_piso || '—'}</td>
                    <td>{u.is_admin ? <span className="chip chip-accent">Admin</span> : <span className="chip">Vecino</span>}</td>
                    <td className="text-sm text-cocoa/60 text-center">{formatUltimaConexion(u.ultima_conexion)}</td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setEditingUser(u)} className="btn btn-ghost p-2 text-cocoa/40 hover:text-cocoa" title="Editar usuario"><Icon name="edit" size={15} /></button>
                        <button onClick={() => setChangingPassword(u)} className="btn btn-ghost p-2 text-cocoa/40 hover:text-cocoa" title="Cambiar contrasena"><Icon name="key" size={15} /></button>
                        {u.id !== user?.id && (
                          <button onClick={() => setDeletingUser(u)} className="btn btn-ghost p-2 text-cocoa/40 hover:text-red-600" title="Eliminar usuario"><Icon name="trash" size={15} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {editingUser && (
        <EditUserModal
          vecino={{ piso: editingUser.vecino_piso || '', nombre: '', user_id: editingUser.id, email: editingUser.email, is_admin: editingUser.is_admin }}
          vecinos={usuarios.map(u => ({ piso: u.vecino_piso || '', nombre: '', user_id: u.id, email: u.email, is_admin: u.is_admin }))}
          currentUserId={user?.id || 0}
          onClose={() => setEditingUser(null)}
          onSaved={() => { setEditingUser(null); fetchUsuarios(); }}
        />
      )}

      {changingPassword && (
        <ChangePasswordModal userId={changingPassword.id} userName={changingPassword.email} onClose={() => setChangingPassword(null)} onSaved={() => setChangingPassword(null)} />
      )}

      {deletingUser && (
        <DeleteUserModal userId={deletingUser.id} userName={deletingUser.email} onClose={() => setDeletingUser(null)} onDeleted={() => { setDeletingUser(null); fetchUsuarios(); }} />
      )}
    </div>
  );
}
