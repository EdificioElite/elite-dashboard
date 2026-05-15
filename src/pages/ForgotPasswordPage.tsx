import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Error al enviar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <img src="/images/elite/Encabezado.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, rgba(58,47,36,.45), rgba(184,138,94,.25), rgba(245,236,220,.15)), linear-gradient(180deg, transparent 50%, rgba(245,236,220,.6) 100%)` }} />
      <div className="relative z-10 glass p-8 w-full max-w-[380px]">
        <div className="flex justify-center mb-5">
          <img src="/images/elite/Logotipo PNG.png" alt="Edificio Elite" className="h-[100px] w-auto" />
        </div>
        <h1 className="font-display text-[26px] font-medium text-center text-cocoa mb-7" style={{ letterSpacing: '-0.02em' }}>
          Recuperar contrasena
        </h1>
        {sent ? (
          <div className="text-sm text-cocoa/70 text-center">
            <p className="mb-4">Si el email existe en nuestro sistema, recibiras un enlace para restablecer tu contrasena.</p>
            <Link to="/login" className="text-accent hover:underline text-sm">Volver al login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="mb-5 px-4 py-3 rounded-xl text-sm flex items-center gap-2 text-rise" style={{ background: 'rgba(163,64,42,.08)' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>{error}</div>}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5 ml-1">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-card" placeholder="vecino@email.com" autoComplete="email" />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full uppercase tracking-[0.04em] mt-2">
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </button>
            <div className="text-center mt-3">
              <Link to="/login" className="text-accent hover:underline text-sm">Volver al login</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
