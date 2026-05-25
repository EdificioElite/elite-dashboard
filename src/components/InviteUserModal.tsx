import { useState, useEffect, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { inviteUser, apiFetch } from '../api/client';

interface VecinoOption {
  piso: string;
}

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export default function InviteUserModal({ onClose, onSaved }: Props) {
  const [email, setEmail] = useState('');
  const [vecinoPiso, setVecinoPiso] = useState('');
  const [vecinos, setVecinos] = useState<VecinoOption[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    apiFetch<VecinoOption[]>('/admin/vecinos')
      .then(setVecinos)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        onSaved();
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [success, onSaved, onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('El email es requerido');
      return;
    }

    setSaving(true);
    try {
      await inviteUser(email, vecinoPiso || undefined);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error al enviar invitacion');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel w-[420px] max-w-[90vw] p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
              <Icon name="mail" size={14} className="text-cream" />
            </div>
            <span className="eyebrow">Invitar usuario</span>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-2 text-cocoa/40 hover:text-cocoa" aria-label="Cerrar">
            <Icon name="x" size={16} />
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(163,64,42,.08)', color: '#a3402a' }}>
            <Icon name="alertTriangle" size={14} />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(91,122,74,.1)', color: '#5b7a4a' }}>
            <Icon name="check" size={14} />
            Invitacion enviada correctamente
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-card" placeholder="vecino@email.com" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Piso (opcional)</label>
              <select value={vecinoPiso} onChange={(e) => setVecinoPiso(e.target.value)} className="input-card">
                <option value="">Sin piso...</option>
                {vecinos.map(v => <option key={v.piso} value={v.piso}>{v.piso}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-2">
              <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
              <button type="submit" disabled={saving} className="btn btn-primary">
                <Icon name="mail" size={14} />
                {saving ? 'Enviando...' : 'Enviar invitacion'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
