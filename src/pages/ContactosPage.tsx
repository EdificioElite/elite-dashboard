
import Icon from '../components/Icon';

const CONTACTS = [
  {
    title: 'Administrador de Fincas',
    icon: 'building' as const,
    color: '#b88a5e',
    name: 'Jose Maria Lopez',
    phone: '+34 666 111 222',
    email: 'josemaria@administracionfincas.es',
  },
  {
    title: 'Mantenedor de Climatizacion',
    icon: 'settings' as const,
    color: '#5b8ba0',
    name: 'Climatizacion Elite S.L.',
    phone: '+34 666 333 444',
    email: 'mantenimiento@climatizacionelite.es',
  },
];

export default function ContactosPage() {
  return (
    <div className="page-in">
      <main className="max-w-[1180px] mx-auto px-6 flex flex-col gap-[22px] pb-10">
        <div className="pt-2">
          <p className="eyebrow">Comunidad</p>
          <h1 className="font-display text-[40px] font-medium text-cocoa mt-1" style={{ letterSpacing: '-0.02em' }}>
            Contactos
          </h1>
        </div>

        <div className="stagger flex flex-col gap-[22px]">
          {CONTACTS.map((c) => (
            <div key={c.title} className="glass p-[26px]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: c.color }}>
                  <Icon name={c.icon} size={14} className="text-cream" />
                </div>
                <span className="eyebrow">{c.title}</span>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-cocoa/40 w-14 shrink-0">Nombre</span>
                  <span className="text-sm font-medium text-cocoa">{c.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-cocoa/40 w-14 shrink-0">Telefono</span>
                  <a href={`tel:${c.phone.replace(/\s/g, '')}`} className="text-sm text-cocoa/70 hover:text-cocoa">
                    {c.phone}
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-cocoa/40 w-14 shrink-0">Email</span>
                  <a href={`mailto:${c.email}`} className="text-sm text-cocoa/70 hover:text-cocoa">
                    {c.email}
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
