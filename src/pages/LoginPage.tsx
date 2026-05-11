import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
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
      setError(err.message || 'Error al iniciar sesion');
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
      <div className="relative z-10 glass p-8 w-full max-w-[380px]">
        <div className="flex justify-center mb-5">
          <img
            src="/images/elite/Logotipo PNG.png"
            alt="Edificio Elite"
            className="h-[100px] w-auto"
          />
        </div>

        <h1
          className="font-display text-[26px] font-medium text-center text-cocoa mb-7"
          style={{ letterSpacing: '-0.02em' }}
        >
          Bienvenido
        </h1>

        {error && (
          <div
            className="mb-5 px-4 py-3 rounded-xl text-sm flex items-center gap-2 text-rise"
            style={{ background: 'rgba(163,64,42,.08)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
            </svg>
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
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5 ml-1">
              Contrasena
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
            className="btn btn-primary w-full uppercase tracking-[0.04em] mt-2"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-[11.5px] text-center text-cocoa/40 mt-6">
          Sin acceso? Contacta con tu administrador.
        </p>
      </div>
    </div>
  );
}
