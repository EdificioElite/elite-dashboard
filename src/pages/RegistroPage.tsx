import { useState, useEffect, FormEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { verifyToken } from '../api/client';
import { useAuthStore } from '../store/auth';

export default function RegistroPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const registerFromInvite = useAuthStore((s) => s.registerFromInvite);

  const [email, setEmail] = useState('');
  const [piso, setPiso] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    if (!token) {
      setError('Enlace de registro inválido');
      setVerifying(false);
      return;
    }
    verifyToken(token)
      .then((data) => {
        if (data.type !== 'invite') {
          setError('Enlace de registro inválido');
        } else {
          setEmail(data.email);
          setPiso(data.piso || '');
        }
      })
      .catch(() => setError('Enlace de registro inválido o expirado'))
      .finally(() => setVerifying(false));
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      await registerFromInvite(token, password);
      navigate('/inicio');
    } catch (err: any) {
      setError(err.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass w-full max-w-[400px] p-8 text-center">
          <div className="text-cocoa/40 text-sm">Verificando enlace...</div>
        </div>
      </div>
    );
  }

  if (error && !email) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass w-full max-w-[400px] p-8 text-center">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-rise/5 border border-rise/20 text-rise text-sm mb-4" role="alert">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M8 4.5V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="11.5" r="0.75" fill="currentColor"/></svg>
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <img src="/images/elite/Encabezado.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, rgba(58,47,36,.45), rgba(184,138,94,.25), rgba(245,236,220,.15)), linear-gradient(180deg, transparent 50%, rgba(245,236,220,.6) 100%)` }} />
      <div className="relative z-10 glass p-8 w-full max-w-[400px]">
        <img src="/images/elite/Logotipo PNG.png" alt="Edificio Elite" className="h-12 w-auto mx-auto mb-6" />
        <h1 className="font-display text-[26px] font-medium text-center text-cocoa mb-7" style={{ letterSpacing: '-0.02em' }}>
          Completa tu registro
        </h1>
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-rise/5 border border-rise/20 text-rise text-sm mb-4" role="alert">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M8 4.5V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="11.5" r="0.75" fill="currentColor"/></svg>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5 ml-1">Email</label>
            <input id="email" type="email" value={email} readOnly className="input-card bg-cocoa/5" autoComplete="email" />
          </div>
          <div>
            <label htmlFor="piso" className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5 ml-1">Piso</label>
            <input id="piso" type="text" value={piso} readOnly className="input-card bg-cocoa/5" />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5 ml-1">Contraseña</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="input-card" placeholder="••••••••" autoComplete="new-password" autoFocus />
          </div>
          <div>
            <label htmlFor="confirm" className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5 ml-1">Confirmar contrasena</label>
            <input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} className="input-card" placeholder="••••••••" autoComplete="new-password" />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary w-full min-h-[44px] uppercase tracking-[0.04em] mt-2">
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>
      </div>
    </div>
  );
}
