import Header from '../components/Header';

export default function AdminAerotermiaPage() {
  return (
    <div className="page-in">
      <Header />
      <main className="max-w-[1180px] mx-auto px-6 flex flex-col gap-[22px] pb-10">
        <div className="pt-2">
          <p className="eyebrow">Panel de administracion</p>
          <h1
            className="font-display text-[40px] font-medium text-cocoa mt-1"
            style={{ letterSpacing: '-0.02em' }}
          >
            Aerotermia Global
          </h1>
          <p className="text-sm text-cocoa/60 mt-1.5 max-w-lg">
            Dashboard general de consumos y facturas del edificio.
          </p>
        </div>

        <div className="glass p-[40px] flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'var(--accent-soft)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
            </svg>
          </div>
          <p className="text-lg font-medium text-cocoa/50 mb-1">Proximamente</p>
          <p className="text-sm text-cocoa/30">Estamos preparando este dashboard.</p>
        </div>
      </main>
    </div>
  );
}
