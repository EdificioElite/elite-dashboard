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
      setError('Enlace de registro invalido');
      setVerifying(false);
      return;
    }
    verifyToken(token)
      .then((data) => {
        if (data.type !== 'invite') {
          setError('Enlace de registro invalido');
        } else {
          setEmail(data.email);
          setPiso(data.piso);
        }
      })
      .catch(() => setError('Enlace de registro invalido o expirado'))
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
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-cocoa/40 text-sm">Verificando enlace...</div>
      </div>
    );
  }

  if (error && !email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="glass p-8 w-full max-w-[380px] text-center">
          <div className="text-rise text-sm">{error}</div>
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
          Completa tu registro
        </h1>
        {error && <div className="mb-5 px-4 py-3 rounded-xl text-sm flex items-center gap-2 text-rise" style={{ background: 'rgba(163,64,42,.08)' }}>{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5 ml-1">Email</label>
            <input type="email" value={email} readOnly className="input-card bg-cocoa/5" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5 ml-1">Piso</label>
            <input type="text" value={piso} readOnly className="input-card bg-cocoa/5" />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5 ml-1">Contrasena</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="input-card" placeholder="••••••••" />
          </div>
          <div>
            <label htmlFor="confirm" className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5 ml-1">Confirmar contrasena</label>
            <input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} className="input-card" placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary w-full uppercase tracking-[0.04em] mt-2">
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>
      </div>
    </div>
  );
}
