import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { deleteJunta } from '../api/client';
import Icon from './Icon';

interface Junta {
  id: number;
  tipo: string;
  fecha: string;
  file_name: string | null;
}

interface Props {
  junta: Junta;
  onClose: () => void;
  onDeleted: () => void;
}

function tipoLabel(tipo: string): string {
  const labels: Record<string, string> = {
    vecinal_ordinaria: 'Vecinal Ordinaria',
    vecinal_extraordinaria: 'Vecinal Extraordinaria',
    vocal_ordinaria: 'Directiva Ordinaria',
    vocal_extraordinaria: 'Directiva Extraordinaria',
  };
  return labels[tipo] || tipo;
}

function fmtFecha(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function DeleteJuntaModal({ junta, onClose, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      await deleteJunta(junta.id);
      onDeleted();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar');
      setDeleting(false);
    }
  };

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel w-[420px] max-w-[90vw] p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--rise)' }}>
              <Icon name="alertTriangle" size={14} className="text-cream" />
            </div>
            <span className="eyebrow">Eliminar junta</span>
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

        <div className="text-center mb-5">
          <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(163,64,42,.1)' }}>
            <Icon name="alertTriangle" size={22} className="text-[var(--rise)]" />
          </div>
          <p className="text-sm font-medium text-cocoa">
            ¿Eliminar esta junta?
          </p>
          <p className="text-sm text-cocoa/50 mt-1">
            Esta accion no se puede deshacer.
          </p>
        </div>

        <div className="mb-5 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(163,64,42,.06)' }}>
          <p className="text-cocoa/70">
            <span className="font-medium text-cocoa">{tipoLabel(junta.tipo)}</span>
          </p>
          <p className="text-cocoa/50 text-xs mt-0.5">
            {fmtFecha(junta.fecha)}
            {junta.file_name && ' — incluye archivo adjunto'}
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} disabled={deleting} className="btn btn-ghost">Cancelar</button>
          <button onClick={handleDelete} disabled={deleting} className="btn" style={{ background: 'var(--rise)', color: '#f5ece0' }}>
            <Icon name="trash" size={14} />
            {deleting ? 'Eliminando...' : 'Eliminar junta'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
