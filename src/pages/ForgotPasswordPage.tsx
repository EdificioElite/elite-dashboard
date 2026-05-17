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
      <div className="relative z-10 glass p-8 w-full max-w-[400px]">
        <img src="/images/elite/Logotipo PNG.png" alt="Edificio Elite" className="h-12 w-auto mx-auto mb-6" />
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
            {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-rise/5 border border-rise/20 text-rise text-sm mb-4" role="alert"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M8 4.5V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="11.5" r="0.75" fill="currentColor"/></svg>{error}</div>}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5 ml-1">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-card" placeholder="vecino@email.com" autoComplete="email" autoFocus />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full min-h-[44px] uppercase tracking-[0.04em] mt-2">
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
