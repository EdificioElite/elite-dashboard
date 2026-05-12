import { useState, FormEvent } from 'react';
import Icon from './Icon';
import { updateUser } from '../api/client';

interface Vecino {
  piso: string;
  nombre: string;
  user_id: number | null;
  email: string | null;
  is_admin: boolean;
}

interface Props {
  vecino: Vecino;
  vecinos: Vecino[];
  currentUserId: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditUserModal({ vecino, vecinos, currentUserId, onClose, onSaved }: Props) {
  const [email, setEmail] = useState(vecino.email || '');
  const [piso, setPiso] = useState(vecino.piso);
  const [isAdmin, setIsAdmin] = useState(vecino.is_admin);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isOwnUser = vecino.user_id === currentUserId;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await updateUser(vecino.user_id!, {
        email: email || undefined,
        vecino_piso: piso || null,
        is_admin: isOwnUser ? undefined : isAdmin,
      });
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(58,47,36,0.3)', backdropFilter: 'blur(4px)' }}>
      <div className="glass p-[26px] w-full max-w-[420px] animate-[fadeUp_250ms_ease-out]">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
              <Icon name="edit" size={14} className="text-cream" />
            </div>
            <span className="eyebrow">Editar usuario</span>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-2 text-cocoa/40 hover:text-cocoa">
            <Icon name="x" size={16} />
          </button>
        </div>

        <p className="text-sm text-cocoa/60 mb-4">
          {vecino.nombre} — Piso {vecino.piso}
        </p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(163,64,42,.08)', color: '#a3402a' }}>
            <Icon name="alertTriangle" size={14} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-card"
              placeholder="vecino@email.com"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Piso</label>
            <select
              value={piso}
              onChange={(e) => setPiso(e.target.value)}
              className="input-card"
            >
              <option value="">Sin piso asignado</option>
              {vecinos.map((v) => (
                <option key={v.piso} value={v.piso}>{v.piso} — {v.nombre}</option>
              ))}
            </select>
          </div>
          {!isOwnUser && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isAdminEdit"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
                className="w-4 h-4 rounded accent-[var(--accent)]"
              />
              <label htmlFor="isAdminEdit" className="text-sm text-cocoa/70 cursor-pointer select-none">
                Es administrador
              </label>
            </div>
          )}
          <div className="flex justify-end gap-3 mt-2">
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              <Icon name="check" size={14} />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
