import { useState, FormEvent } from 'react';
import Icon from './Icon';
import { apiFetch } from '../api/client';

interface VecinoData {
  piso: string;
  nombre: string | null;
  email: string | null;
  coeficiente: string | null;
  enviar_email: boolean;
  device_identification: string | null;
  serial_number: string | null;
}

interface Props {
  vecino: VecinoData;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditVecinoModal({ vecino, onClose, onSaved }: Props) {
  const [nombre, setNombre] = useState(vecino.nombre || '');
  const [email, setEmail] = useState(vecino.email || '');
  const [coeficiente, setCoeficiente] = useState(vecino.coeficiente || '');
  const [enviarEmail, setEnviarEmail] = useState(vecino.enviar_email);
  const [deviceId, setDeviceId] = useState(vecino.device_identification || '');
  const [serialNumber, setSerialNumber] = useState(vecino.serial_number || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await apiFetch(`/admin/vecinos/${vecino.piso}`, {
        method: 'PUT',
        body: JSON.stringify({
          nombre: nombre || null,
          email: email || null,
          coeficiente: coeficiente || null,
          enviar_email: enviarEmail,
          device_identification: deviceId || null,
          serial_number: serialNumber || null,
        }),
      });
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar vecino');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(58,47,36,0.3)', backdropFilter: 'blur(4px)' }}>
      <div className="glass p-[26px] w-full max-w-[480px] animate-[fadeUp_250ms_ease-out]">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-2)' }}>
              <Icon name="users" size={14} className="text-cream" />
            </div>
            <span className="eyebrow">Editar vecino</span>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-2 text-cocoa/40 hover:text-cocoa">
            <Icon name="x" size={16} />
          </button>
        </div>

        <p className="text-sm text-cocoa/60 mb-4">Piso {vecino.piso}</p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(163,64,42,.08)', color: '#a3402a' }}>
            <Icon name="alertTriangle" size={14} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Nombre</label>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="input-card" placeholder="Nombre del vecino" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Email facturas</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-card" placeholder="Email para facturas" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Coeficiente</label>
            <input type="text" value={coeficiente} onChange={(e) => setCoeficiente(e.target.value)} className="input-card" placeholder="0.20" />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="enviarEmailVecino" checked={enviarEmail} onChange={(e) => setEnviarEmail(e.target.checked)} className="w-4 h-4 rounded accent-[var(--accent)]" />
            <label htmlFor="enviarEmailVecino" className="text-sm text-cocoa/70 cursor-pointer select-none">Enviar facturas por email</label>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Device Identification</label>
            <input type="text" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} className="input-card" placeholder="DEVID001" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Serial Number</label>
            <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className="input-card" placeholder="10000001" />
          </div>
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
