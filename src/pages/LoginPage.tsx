import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const user = useAuthStore.getState().user;
      navigate(user?.is_admin ? '/admin' : '/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Background image */}
      <img
        src="/images/elite/Encabezado.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(135deg, rgba(58,47,36,.45), rgba(184,138,94,.25), rgba(245,236,220,.15)),
            linear-gradient(180deg, transparent 50%, rgba(245,236,220,.6) 100%)
          `,
        }}
      />

      {/* Card */}
      <div className="relative z-10 glass p-8 w-full max-w-[400px]">
        <img
          src="/images/elite/Logotipo PNG.png"
          alt="Edificio Elite"
          className="h-12 w-auto mx-auto mb-6"
        />

        <h1
          className="font-display text-[26px] font-medium text-center text-cocoa mb-7"
          style={{ letterSpacing: '-0.02em' }}
        >
          Bienvenido
        </h1>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-rise/5 border border-rise/20 text-rise text-sm mb-4" role="alert">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M8 4.5V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="11.5" r="0.75" fill="currentColor"/></svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5 ml-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-card"
              placeholder="vecino@email.com"
              autoComplete="email"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5 ml-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input-card"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full min-h-[44px] uppercase tracking-[0.04em] mt-2"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link to="/recuperar-contrasena" className="text-sm text-accent hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

      </div>
    </div>
  );
}
