import { useState, useEffect, FormEvent, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { updateJunta } from '../api/client';

interface Junta {
  id: number;
  tipo: string;
  fecha: string;
  file_name: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  junta: Junta;
  onClose: () => void;
  onUpdated: () => void;
}

const TIPO_OPTIONS = [
  { value: 'vecinal_ordinaria', label: 'Vecinal Ordinaria' },
  { value: 'vecinal_extraordinaria', label: 'Vecinal Extraordinaria' },
  { value: 'vocal_ordinaria', label: 'Directiva Ordinaria' },
  { value: 'vocal_extraordinaria', label: 'Directiva Extraordinaria' },
];

export default function EditJuntaModal({ junta, onClose, onUpdated }: Props) {
  const [tipo, setTipo] = useState(junta.tipo);
  const [fecha, setFecha] = useState(junta.fecha);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        onUpdated();
        onClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [success, onUpdated, onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    setSaving(true);
    try {
      await updateJunta(junta.id, { tipo, fecha, archivo });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar junta');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.type !== 'application/pdf') {
      setError('Solo se permiten archivos PDF');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setArchivo(file);
  };

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel w-[540px] max-w-[90vw] p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
              <Icon name="edit" size={14} className="text-cream" />
            </div>
            <span className="eyebrow">Editar junta</span>
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
            Junta actualizada correctamente
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="input-card w-full">
                {TIPO_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Fecha</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input-card w-full" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Acta (PDF) — opcional</label>
              {junta.file_name && (
                <p className="text-xs text-cocoa/40 mb-2">Archivo actual: {junta.file_name}</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="input-card w-full text-sm text-cocoa/70 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-sage/10 file:text-sage"
              />
              {archivo && (
                <p className="text-xs text-cocoa/40 mt-1">Nuevo: {archivo.name}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-2">
              <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
              <button type="submit" disabled={saving} className="btn btn-primary">
                <Icon name="check" size={14} />
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
