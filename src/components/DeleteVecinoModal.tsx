import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import Icon from './Icon';

interface Props {
  piso: string;
  userEmail: string | null;
  userId: number | null;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteVecinoModal({ piso, userEmail, userId, onClose, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleBackdropClick = () => onClose();

  const handleDelete = async (deleteUser: boolean) => {
    setDeleting(true);
    setError('');
    try {
      if (deleteUser && userId) {
        await apiFetch(`/admin/usuarios/${userId}`, { method: 'DELETE' });
      }
      await apiFetch(`/admin/vecinos/${piso}`, { method: 'DELETE' });
      onDeleted();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar');
      setDeleting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-panel w-[420px] max-w-[90vw] p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--rise)' }}>
              <Icon name="alertTriangle" size={14} className="text-cream" />
            </div>
            <span className="eyebrow">Eliminar vecino</span>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-2 text-cocoa/40 hover:text-cocoa">
            <Icon name="x" size={16} />
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(163,64,42,.08)', color: '#a3402a' }}>
            <Icon name="alertTriangle" size={14} />
            {error}
          </div>
        )}

        <p className="text-sm text-cocoa/70 mb-4">
          {userEmail
            ? `El vecino ${piso} tiene un usuario asociado (${userEmail}). ¿Que quieres hacer?`
            : `¿Eliminar el vecino ${piso}?`}
        </p>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} disabled={deleting} className="btn btn-ghost">Cancelar</button>
          {userEmail && (
            <button onClick={() => handleDelete(false)} disabled={deleting} className="btn btn-ghost text-cocoa/70">
              Solo desvincular
            </button>
          )}
          <button onClick={() => handleDelete(!!userEmail)} disabled={deleting} className="btn text-cream" style={{ background: 'var(--rise)' }}>
            <Icon name="trash" size={14} />
            {deleting ? 'Eliminando...' : userEmail ? 'Eliminar vecino y usuario' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}
