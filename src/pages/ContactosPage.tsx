
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
            <div key={c.title} className="glass glass-hover p-6">
              <div className="flex items-center gap-4 mb-5">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-cream font-display text-lg font-medium"
                  style={{ background: c.color }}
                >
                  {c.name.charAt(0)}
                </div>
                <div>
                  <span className="eyebrow">{c.title}</span>
                  <p className="text-sm font-medium text-cocoa mt-0.5">{c.name}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href={`tel:${c.phone.replace(/\s/g, '')}`}
                  className="btn-secondary min-h-[44px] inline-flex items-center gap-2"
                >
                  <Icon name="phone" size={14} />
                  {c.phone}
                </a>
                <a
                  href={`mailto:${c.email}`}
                  className="btn-secondary min-h-[44px] inline-flex items-center gap-2"
                >
                  <Icon name="mail" size={14} />
                  {c.email}
                </a>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
