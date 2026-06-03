import { useState, useEffect, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { changePassword } from '../api/client';

interface Props {
  userId: number;
  userName: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function ChangePasswordModal({ userId, userName, onClose, onSaved }: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleBackdropClick = () => onClose();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setSaving(true);
    try {
      await changePassword(userId, password);
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Error al cambiar contraseña');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-panel w-[420px] max-w-[90vw] p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-2)' }}>
              <Icon name="key" size={14} className="text-cream" />
            </div>
            <span className="eyebrow">Cambiar contraseña</span>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-2 text-cocoa/40 hover:text-cocoa" aria-label="Cerrar">
            <Icon name="x" size={16} />
          </button>
        </div>

        <p className="text-sm text-cocoa/60 mb-4">{userName}</p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(163,64,42,.08)', color: '#a3402a' }}>
            <Icon name="alertTriangle" size={14} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Nueva contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="input-card"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Confirmar contraseña</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              className="input-card"
              placeholder="Repetir contraseña"
            />
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              <Icon name="check" size={14} />
              {saving ? 'Cambiando...' : 'Cambiar'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
