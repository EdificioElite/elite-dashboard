import Icon from '../components/Icon';

interface ContactEntry {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  details: { label: string; value: string; href?: string; icon?: string }[];
}

const CONTACTS: ContactEntry[] = [
  {
    title: 'Administrador de Fincas',
    subtitle: 'Martin y Lorente — Juanjo Montalvo',
    icon: 'building',
    color: '#b88a5e',
    details: [
      { label: 'Email', value: 'juanjomontalvo@martinylorente.es', href: 'mailto:juanjomontalvo@martinylorente.es', icon: 'mail' },
      { label: 'Web', value: 'www.martinylorente.es', href: 'https://www.martinylorente.es', icon: 'eye' },
      { label: 'Telefono', value: '91.796.00.43 / 91.505.53.10 / 91.060.79.46', href: 'tel:917960043', icon: 'phone' },
    ],
  },
  {
    title: 'Mantenimiento Aerotermia',
    subtitle: 'Ness',
    icon: 'settings',
    color: '#4a7a8c',
    details: [
      { label: 'Urgencias 24h', value: '+34 602 22 52 97', href: 'tel:+34602225297', icon: 'zap' },
      { label: 'Atencion al cliente', value: '+34 917 99 26 88', href: 'tel:+34917992688', icon: 'phone' },
      { label: 'Email', value: 'clientes@ness.es', href: 'mailto:clientes@ness.es', icon: 'mail' },
    ],
  },
  {
    title: 'Limpieza y Paqueteria',
    subtitle: 'Cristina',
    icon: 'home',
    color: '#6f8a5c',
    details: [
      { label: 'Email', value: 'info@cnlimpiezas.com', href: 'mailto:info@cnlimpiezas.com', icon: 'mail' },
      { label: 'Telefono', value: '634 466 849', href: 'tel:+34634466849', icon: 'phone' },
    ],
  },
];

export default function ContactosPage() {
  return (
    <div className="page-in">
      <main className="max-w-[900px] mx-auto px-6 flex flex-col gap-[22px] pb-10">
        <div className="pt-2">
          <p className="eyebrow">Comunidad</p>
          <h1 className="font-display text-[40px] font-medium text-cocoa mt-1" style={{ letterSpacing: '-0.02em' }}>
            Contactos
          </h1>
        </div>

        <div className="stagger flex flex-col gap-[16px]">
          {CONTACTS.map((c) => (
            <div
              key={c.title}
              className="group glass glass-hover p-[26px] relative overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 w-1 h-full opacity-40 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: c.color }}
              />

              <div className="flex items-start gap-4 mb-5">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: c.color }}
                >
                  <Icon name={c.icon as any} size={16} className="text-cream" />
                </div>
                <div className="min-w-0">
                  <span className="eyebrow">{c.title}</span>
                  <h2 className="font-display text-[24px] font-medium text-cocoa mt-0.5" style={{ letterSpacing: '-0.02em' }}>
                    {c.subtitle}
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {c.details.map((d) => (
                  <a
                    key={d.label}
                    href={d.href}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-cocoa/6 hover:border-cocoa/12 bg-cream/30 hover:bg-cream/60 transition-all duration-200 group/link no-underline"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 opacity-30" style={{ background: c.color }}>
                      <Icon name={(d.icon || 'info') as any} size={12} className="text-cream" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-cocoa/30 mb-0.5">{d.label}</span>
                      <span className="block text-[13px] font-medium text-cocoa/80 font-num group-hover/link:text-cocoa transition-colors truncate">
                        {d.value}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
