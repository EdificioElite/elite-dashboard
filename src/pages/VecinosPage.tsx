import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import Icon from '../components/Icon';
import EditVecinoModal from '../components/EditVecinoModal';
import DeleteVecinoModal from '../components/DeleteVecinoModal';

interface Vecino {
  piso: string;
  nombre: string;
  user_id: number | null;
  email: string | null;
  vecino_email: string | null;
  is_admin: boolean;
  coeficiente: string | null;
  enviar_email: boolean;
  device_identification: string | null;
  serial_number: string | null;
}

export default function VecinosPage() {
  const navigate = useNavigate();
  const [vecinos, setVecinos] = useState<Vecino[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingVecinoData, setEditingVecinoData] = useState<Vecino | null>(null);
  const [deletingVecino, setDeletingVecino] = useState<Vecino | null>(null);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const [newPiso, setNewPiso] = useState('');
  const [newNombre, setNewNombre] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCoeficiente, setNewCoeficiente] = useState('');
  const [newEnviarEmail, setNewEnviarEmail] = useState(false);
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newSerialNumber, setNewSerialNumber] = useState('');

  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteError, setInviteError] = useState(false);
  const [editingVecinoEmail, setEditingVecinoEmail] = useState<string | null>(null);
  const [editingVecinoEmailValue, setEditingVecinoEmailValue] = useState('');

  const fetchVecinos = () => {
    apiFetch<Vecino[]>('/admin/vecinos').then(setVecinos).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchVecinos(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    try {
      await apiFetch('/admin/vecinos', {
        method: 'POST',
        body: JSON.stringify({
          piso: newPiso,
          nombre: newNombre || null,
          email: newEmail || null,
          coeficiente: newCoeficiente || null,
          enviar_email: newEnviarEmail,
          device_identification: newDeviceId || null,
          serial_number: newSerialNumber || null,
        }),
      });
      setFormSuccess('Vecino creado');
      setNewPiso(''); setNewNombre(''); setNewEmail(''); setNewCoeficiente('');
      setNewEnviarEmail(false); setNewDeviceId(''); setNewSerialNumber('');
      setShowForm(false);
      fetchVecinos();
    } catch (err: any) {
      setFormError(err.message || 'Error al crear vecino');
    }
  };

  const handleInvite = async (piso: string) => {
    setInviteMessage('');
    setInviteError(false);
    try {
      await apiFetch('/admin/invitar', { method: 'POST', body: JSON.stringify({ piso }) });
      setInviteMessage('Invitacion enviada correctamente');
    } catch (err: any) {
      setInviteMessage(err.message || 'Error al enviar invitacion');
      setInviteError(true);
    }
  };

  useEffect(() => {
    if (inviteMessage) {
      const timer = setTimeout(() => setInviteMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [inviteMessage]);

  const handleSaveVecinoEmail = async () => {
    if (!editingVecinoEmail || !editingVecinoEmailValue) return;
    try {
      await apiFetch(`/admin/vecinos/${editingVecinoEmail}`, {
        method: 'PUT',
        body: JSON.stringify({ email: editingVecinoEmailValue }),
      });
      setEditingVecinoEmail(null);
      fetchVecinos();
    } catch (err: any) {
      alert(err.message || 'Error al guardar email');
    }
  };

  const filtered = vecinos.filter(v =>
    v.piso.toLowerCase().includes(search.toLowerCase()) ||
    (v.nombre && v.nombre.toLowerCase().includes(search.toLowerCase()))
  );

  const stats = [
    { label: 'Vecinos', value: vecinos.length, icon: 'users', iconColor: 'var(--accent)' },
    { label: 'Con email facturas', value: vecinos.filter(v => v.vecino_email).length, icon: 'mail', iconColor: 'var(--sage)' },
    { label: 'Con usuario', value: vecinos.filter(v => v.user_id).length, icon: 'check', iconColor: 'var(--accent-2)' },
  ];

  if (loading) return <div><main className="max-w-[1180px] mx-auto px-6 flex items-center justify-center min-h-[60vh]"><div className="text-cocoa/40 text-sm">Cargando...</div></main></div>;

  return (
    <div className="page-in">
      {(inviteMessage) && (
          <div className="max-w-[1180px] mx-auto px-6 pt-2">
            <div
              className="px-4 py-3 rounded-xl text-sm flex items-center gap-2"
              style={
                inviteError
                  ? { background: 'rgba(163,64,42,.08)', color: '#a3402a' }
                  : { background: 'rgba(91,122,74,.1)', color: '#5b7a4a' }
              }
            >
              <Icon name={inviteError ? 'alertTriangle' : 'check'} size={14} />
              {inviteMessage}
            </div>
          </div>
        )}

      <main className="max-w-[1180px] mx-auto px-6 flex flex-col gap-[22px] pb-10">
        <div className="pt-2 flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="eyebrow">Panel de administracion</p>
            <h1 className="font-display text-[40px] font-medium text-cocoa mt-1" style={{ letterSpacing: '-0.02em' }}>Vecinos</h1>
            <p className="text-sm text-cocoa/60 mt-1.5 max-w-lg">Gestiona los vecinos del edificio.</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className={`btn ${showForm ? 'btn-ghost' : 'btn-primary'}`}>
            <Icon name={showForm ? 'x' : 'plus'} size={14} />
            {showForm ? 'Cancelar' : 'Añadir vecino'}
          </button>
        </div>

        <section aria-label="Gestión de vecinos">

        <div className="grid grid-cols-3 gap-[16px]">
          {stats.map(s => (
            <div key={s.label} className="glass p-[20px] glass-hover">
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
              <span className="eyebrow">Nuevo vecino</span>
            </div>
            {formError && <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(163,64,42,.08)', color: '#a3402a' }}><Icon name="alertTriangle" size={14} />{formError}</div>}
            {formSuccess && <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(91,122,74,.1)', color: '#5b7a4a' }}><Icon name="check" size={14} />{formSuccess}</div>}
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Piso *</label>
                <input type="text" value={newPiso} onChange={e => setNewPiso(e.target.value)} required className="input-card" placeholder="1A" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Nombre</label>
                <input type="text" value={newNombre} onChange={e => setNewNombre(e.target.value)} className="input-card" placeholder="Nombre del vecino" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Email facturas</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="input-card" placeholder="vecino@email.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Coeficiente</label>
                <input type="text" value={newCoeficiente} onChange={e => setNewCoeficiente(e.target.value)} className="input-card" placeholder="0.20" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Device ID</label>
                <input type="text" value={newDeviceId} onChange={e => setNewDeviceId(e.target.value)} className="input-card" placeholder="DEVID001" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Serial Number</label>
                <input type="text" value={newSerialNumber} onChange={e => setNewSerialNumber(e.target.value)} className="input-card" placeholder="10000001" />
              </div>
              <div className="md:col-span-3 flex items-center gap-3">
                <input type="checkbox" id="newEnviarEmail" checked={newEnviarEmail} onChange={e => setNewEnviarEmail(e.target.checked)} className="w-4 h-4 rounded accent-[var(--accent)]" />
                <label htmlFor="newEnviarEmail" className="text-sm text-cocoa/70 cursor-pointer select-none">Enviar facturas por email</label>
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
            <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cocoa/[0.03] border border-cocoa/[0.06]">
              <Icon name="search" size={13} className="text-cocoa/30" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar vecino..." className="bg-transparent border-none text-sm text-cocoa placeholder-cocoa/25 outline-none w-36" />
            </div>
          </div>

          <div className="overflow-x-auto -mx-2">
            <table className="table-glass">
              <caption className="sr-only">Tabla de vecinos del edificio</caption>
              <thead>
                <tr>
                  <th scope="col">Piso</th>
                  <th scope="col">Nombre</th>
                  <th scope="col">Email facturas</th>
                  <th scope="col">Coeficiente</th>
                  <th scope="col" className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v, i) => (
                  <tr key={v.piso} className="row-stagger" style={{ animationDelay: `${i * 40}ms` }}>
                    <td className="font-medium text-cocoa">{v.piso}</td>
                    <td className="text-cocoa/60">{v.nombre || '—'}</td>
                    <td className="text-sm text-cocoa/50">{v.vecino_email || '—'}</td>
                    <td className="text-sm text-cocoa/50">{v.coeficiente || '—'}</td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => navigate(`/admin/vecino/${v.piso}`)} className="btn btn-ghost p-2 text-accent hover:text-accent/80" title="Ver aerotermia">
                          <Icon name="chart" size={15} />
                        </button>
                        {v.vecino_email ? (
                          !v.user_id ? (
                            <button onClick={() => handleInvite(v.piso)} className="btn btn-ghost p-2 text-accent hover:text-accent/80" title="Enviar invitacion">
                              <Icon name="mail" size={15} />
                            </button>
                          ) : (
                            <span className="text-[11px] text-cocoa/25 w-[24px] text-center" title={v.vecino_email}>✓</span>
                          )
                        ) : (
                          editingVecinoEmail === v.piso ? (
                            <span className="flex items-center gap-1">
                              <input type="email" value={editingVecinoEmailValue} onChange={e => setEditingVecinoEmailValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSaveVecinoEmail(); if (e.key === 'Escape') setEditingVecinoEmail(null); }} className="input-card text-xs py-0.5 px-1.5 w-32" placeholder="email..." autoFocus />
                              <button onClick={handleSaveVecinoEmail} className="btn btn-ghost p-1 text-sage" title="Guardar email"><Icon name="check" size={12} /></button>
                              <button onClick={() => setEditingVecinoEmail(null)} className="btn btn-ghost p-1 text-rise" title="Cancelar edicion email"><Icon name="x" size={12} /></button>
                            </span>
                          ) : (
                            <button onClick={() => { setEditingVecinoEmail(v.piso); setEditingVecinoEmailValue(''); }} className="btn btn-ghost p-2 text-cocoa/40 hover:text-accent" title="Asignar email facturas">
                              <Icon name="mail" size={15} />
                            </button>
                          )
                        )}
                        <button onClick={() => setEditingVecinoData(v)} className="btn btn-ghost p-2 text-cocoa/40 hover:text-accent-2" title="Editar vecino">
                          <Icon name="edit" size={15} />
                        </button>
                        <button onClick={() => setDeletingVecino(v)} className="btn btn-ghost p-2 text-cocoa/40 hover:text-red-600" title="Eliminar vecino">
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="text-sm text-cocoa/40 py-8 text-center">No se encontraron vecinos</div>}
          </div>
        </div>
        </section>
      </main>

      {editingVecinoData && (
        <EditVecinoModal
          vecino={{
            piso: editingVecinoData.piso,
            nombre: editingVecinoData.nombre,
            email: editingVecinoData.vecino_email,
            coeficiente: editingVecinoData.coeficiente,
            enviar_email: editingVecinoData.enviar_email || false,
            device_identification: editingVecinoData.device_identification,
            serial_number: editingVecinoData.serial_number,
          }}
          onClose={() => setEditingVecinoData(null)}
          onSaved={() => { setEditingVecinoData(null); fetchVecinos(); }}
        />
      )}

      {deletingVecino && (
        <DeleteVecinoModal
          piso={deletingVecino.piso}
          userEmail={deletingVecino.email}
          userId={deletingVecino.user_id}
          onClose={() => setDeletingVecino(null)}
          onDeleted={() => { setDeletingVecino(null); fetchVecinos(); }}
        />
      )}
    </div>
  );
}
