import { useState, useEffect, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { apiFetch } from '../api/client';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export default function AddVecinoModal({ onClose, onSaved }: Props) {
  const [newPiso, setNewPiso] = useState('');
  const [newNombre, setNewNombre] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCoeficiente, setNewCoeficiente] = useState('');
  const [newEnviarEmail, setNewEnviarEmail] = useState(false);
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newSerialNumber, setNewSerialNumber] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

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

    if (!newPiso) {
      setError('El piso es requerido');
      return;
    }

    setSaving(true);
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
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error al crear vecino');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel w-[540px] max-w-[90vw] p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
              <Icon name="plus" size={14} className="text-cream" />
            </div>
            <span className="eyebrow">Añadir vecino</span>
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
            Vecino creado correctamente
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Piso *</label>
                <input type="text" value={newPiso} onChange={(e) => setNewPiso(e.target.value)} required className="input-card" placeholder="1A" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Nombre</label>
                <input type="text" value={newNombre} onChange={(e) => setNewNombre(e.target.value)} className="input-card" placeholder="Nombre del vecino" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Email facturas</label>
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="input-card" placeholder="vecino@email.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Coeficiente</label>
                <input type="text" value={newCoeficiente} onChange={(e) => setNewCoeficiente(e.target.value)} className="input-card" placeholder="0.20" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Device ID</label>
                <input type="text" value={newDeviceId} onChange={(e) => setNewDeviceId(e.target.value)} className="input-card" placeholder="DEVID001" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Serial Number</label>
                <input type="text" value={newSerialNumber} onChange={(e) => setNewSerialNumber(e.target.value)} className="input-card" placeholder="10000001" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="newEnviarEmail" checked={newEnviarEmail} onChange={(e) => setNewEnviarEmail(e.target.checked)} className="w-4 h-4 rounded accent-[var(--accent)]" />
              <label htmlFor="newEnviarEmail" className="text-sm text-cocoa/70 cursor-pointer select-none">Enviar facturas por email</label>
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
