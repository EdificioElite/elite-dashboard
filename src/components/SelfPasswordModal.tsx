import { useState, useRef, useEffect, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { changeOwnPassword } from '../api/client';

interface Props {
  onClose: () => void;
}

export default function SelfPasswordModal({ onClose }: Props) {
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleBackdropClick = () => onClose();

  const validate = (): string | null => {
    if (!current) return 'La contraseña actual es requerida';
    if (!password) return 'La nueva contraseña es requerida';
    if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
    if (!/[A-Z]/.test(password)) return 'La contraseña debe contener al menos una mayúscula';
    if (!/[a-z]/.test(password)) return 'La contraseña debe contener al menos una minúscula';
    if (!/[0-9]/.test(password)) return 'La contraseña debe contener al menos un número';
    if (password !== confirm) return 'Las contraseñas no coinciden';
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      await changeOwnPassword(current, password);
      setSuccess(true);
      setTimeout(() => { if (mountedRef.current) onClose(); }, 1500);
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
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--accent-2)' }}
            >
              <Icon name="key" size={14} className="text-cream" />
            </div>
            <span className="eyebrow">Cambiar contraseña</span>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost p-2 text-cocoa/40 hover:text-cocoa"
            aria-label="Cerrar"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {success ? (
          <div
            className="px-4 py-3 rounded-xl text-sm flex items-center gap-2"
            style={{ background: 'rgba(52,199,89,0.1)', color: '#34c759' }}
          >
            <Icon name="check" size={14} />
            Contraseña actualizada correctamente
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            {error && (
              <div
                id="password-error"
                role="alert"
                className="px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                style={{ background: 'rgba(163,64,42,.08)', color: '#a3402a' }}
              >
                <Icon name="alertTriangle" size={14} />
                {error}
              </div>
            )}

            <div>
              <label htmlFor="current-password" className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">
                Contraseña actual
              </label>
              <input
                id="current-password"
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
                aria-describedby={error ? 'password-error' : undefined}
                className="input-card"
                placeholder="Tu contraseña actual"
              />
            </div>
            <div>
              <label htmlFor="new-password" className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">
                Nueva contraseña
              </label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                aria-describedby={error ? 'password-error' : undefined}
                className="input-card"
                placeholder="Mínimo 8 caracteres, mayúscula, minúscula y número"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">
                Confirmar contraseña
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                aria-describedby={error ? 'password-error' : undefined}
                className="input-card"
                placeholder="Repetir nueva contraseña"
              />
            </div>
            <div className="flex justify-end gap-3 mt-2">
              <button type="button" onClick={onClose} className="btn btn-ghost">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="btn btn-primary">
                <Icon name="check" size={14} />
                {saving ? 'Cambiando...' : 'Cambiar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
