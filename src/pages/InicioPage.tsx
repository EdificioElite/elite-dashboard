import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { apiFetch } from '../api/client';
import { greeting } from '../lib/format';
import Header from '../components/Header';
import ConsumoCard from '../components/ConsumoCard';
import Icon from '../components/Icon';

interface Consumo {
  timestamp: string;
  kwh_calor: number;
  kwh_frio: number;
  m3_acs: number;
  kwh_acs: number;
  kwh_calor_abs: number;
  kwh_frio_abs: number;
  m3_acs_abs: number;
  kwh_calor_mes_inicio: number | null;
  kwh_frio_mes_inicio: number | null;
  m3_acs_mes_inicio: number | null;
  temp_impulsion: number | null;
  temp_retorno: number | null;
  power_w: number | null;
}

const POOL_CONTENT = {
  title: 'Piscina',
  icon: 'sun' as const,
  color: '#5b8ba0',
  lines: [
    { label: 'Apertura', value: '15 de Junio' },
    { label: 'Cierre', value: '1 de Septiembre' },
    { label: 'Horario', value: '11:00 — 20:00' },
  ],
};

const MEETING_CONTENT = {
  title: 'Proxima Junta de Vecinos',
  icon: 'calendar' as const,
  color: '#b88a5e',
  text: 'Junta extraordinaria Lunes 1 de Junio a las 19:00',
};

function InfoCard({ title, icon, color, children }: { title: string; icon: string; color: string; children: React.ReactNode }) {
  return (
    <div className="glass p-[26px]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: color }}>
          <Icon name={icon as any} size={14} className="text-cream" />
        </div>
        <span className="eyebrow">{title}</span>
      </div>
      {children}
    </div>
  );
}

export default function InicioPage() {
  const { user } = useAuthStore();
  const [consumoActual, setConsumoActual] = useState<Consumo | null>(null);
  const [loading, setLoading] = useState(true);

  const { saludo } = greeting();
  const nombre = user?.vecino_piso || user?.email?.split('@')[0] || 'vecino';

  useEffect(() => {
    apiFetch<Consumo | null>('/consumo-actual')
      .then(setConsumoActual)
      .catch(() => setConsumoActual(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <Header showAdmin />
        <main className="max-w-[1180px] mx-auto px-6 flex items-center justify-center min-h-[60vh]">
          <div className="text-cocoa/40 text-sm">Cargando...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-in">
      <Header />

      <main className="max-w-[1180px] mx-auto px-6 flex flex-col gap-[22px] pb-10">
        <div className="pt-2">
          <p className="eyebrow">Inicio</p>
          <h1 className="font-display text-[40px] font-medium text-cocoa mt-1" style={{ letterSpacing: '-0.02em' }}>
            {saludo}, {nombre}.
          </h1>
        </div>

        <div className="stagger flex flex-col gap-[22px]">
          <ConsumoCard data={consumoActual} />

          <InfoCard title={POOL_CONTENT.title} icon={POOL_CONTENT.icon} color={POOL_CONTENT.color}>
            <div className="flex flex-col gap-2">
              {POOL_CONTENT.lines.map((line) => (
                <div key={line.label} className="flex items-center gap-3">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-cocoa/40 w-20 shrink-0">{line.label}</span>
                  <span className="text-sm text-cocoa/80">{line.value}</span>
                </div>
              ))}
            </div>
          </InfoCard>

          <InfoCard title={MEETING_CONTENT.title} icon={MEETING_CONTENT.icon} color={MEETING_CONTENT.color}>
            <p className="text-sm text-cocoa/80">{MEETING_CONTENT.text}</p>
          </InfoCard>
        </div>
      </main>
    </div>
  );
}
