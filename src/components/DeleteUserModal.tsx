import { useState, useEffect } from 'react';
import Icon from './Icon';
import { deleteUser } from '../api/client';

interface Props {
  userId: number;
  userName: string;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteUserModal({ userId, userName, onClose, onDeleted }: Props) {
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleBackdropClick = () => onClose();

  const handleDelete = async () => {
    setError('');
    setDeleting(true);
    try {
      await deleteUser(userId);
      onDeleted();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-panel w-[420px] max-w-[90vw] p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#a3402a' }}>
              <Icon name="trash" size={14} className="text-cream" />
            </div>
            <span className="eyebrow">Eliminar acceso</span>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-2 text-cocoa/40 hover:text-cocoa">
            <Icon name="x" size={16} />
          </button>
        </div>

        <p className="text-sm text-cocoa/70 mb-1">Estas seguro de que queres eliminar el acceso de:</p>
        <p className="text-sm font-semibold text-cocoa mb-4">{userName}</p>
        <p className="text-xs text-cocoa/40 mb-4">Esta accion no se puede deshacer. El vecino perdera el acceso al dashboard.</p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(163,64,42,.08)', color: '#a3402a' }}>
            <Icon name="alertTriangle" size={14} />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-2">
          <button onClick={onClose} disabled={deleting} className="btn btn-ghost">Cancelar</button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="btn"
            style={{ background: '#a3402a', color: '#fff8ee' }}
          >
            <Icon name="trash" size={14} />
            {deleting ? 'Eliminando...' : 'Eliminar acceso'}
          </button>
        </div>
      </div>
    </div>
  );
}
