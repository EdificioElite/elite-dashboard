import { useState, useEffect, FormEvent } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { verifyToken, resetPassword } from '../api/client';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    if (!token) {
      setTokenError('Enlace invalido');
      setVerifying(false);
      return;
    }
    verifyToken(token)
      .then((data) => {
        if (data.type !== 'reset') setTokenError('Enlace invalido');
      })
      .catch(() => setTokenError('Enlace invalido o expirado'))
      .finally(() => setVerifying(false));
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Las contrasenas no coinciden');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error al restablecer la contrasena');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-cocoa/40 text-sm">Verificando enlace...</div>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="glass p-8 w-full max-w-[380px] text-center">
          <div className="text-rise text-sm mb-4 flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
            </svg>
            {tokenError}
          </div>
          <Link to="/login" className="text-accent hover:underline text-sm">Volver al login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <img src="/images/elite/Encabezado.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, rgba(58,47,36,.45), rgba(184,138,94,.25), rgba(245,236,220,.15)), linear-gradient(180deg, transparent 50%, rgba(245,236,220,.6) 100%)` }} />
      <div className="relative z-10 glass p-8 w-full max-w-[380px]">
        <div className="flex justify-center mb-5">
          <img src="/images/elite/Logotipo PNG.png" alt="Edificio Elite" className="h-[100px] w-auto" />
        </div>
        <h1 className="font-display text-[26px] font-medium text-center text-cocoa mb-7" style={{ letterSpacing: '-0.02em' }}>
          Nueva contrasena
        </h1>
        {success ? (
          <div className="text-sm text-cocoa/70 text-center">
            <p className="mb-4">Tu contrasena ha sido actualizada correctamente.</p>
            <Link to="/login" className="text-accent hover:underline text-sm">Ir al login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="mb-5 px-4 py-3 rounded-xl text-sm flex items-center gap-2 text-rise" style={{ background: 'rgba(163,64,42,.08)' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>{error}</div>}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5 ml-1">Nueva contrasena</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="input-card" placeholder="••••••••" autoComplete="new-password" />
            </div>
            <div>
              <label htmlFor="confirm" className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5 ml-1">Confirmar contrasena</label>
              <input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} className="input-card" placeholder="••••••••" autoComplete="new-password" />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full uppercase tracking-[0.04em] mt-2">
              {loading ? 'Guardando...' : 'Guardar contrasena'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
