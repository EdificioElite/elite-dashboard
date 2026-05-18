
import Icon from '../components/Icon';

interface Junta {
  tipo: 'Ordinaria' | 'Extraordinaria';
  fecha: string;
  titulo: string;
}

const JUNTAS: Junta[] = [
  { tipo: 'Ordinaria', fecha: 'Viernes 15 de Marzo 2026 — 18:00', titulo: 'Junta General Ordinaria' },
  { tipo: 'Ordinaria', fecha: 'Viernes 20 de Junio 2026 — 18:00', titulo: 'Junta General Ordinaria' },
  { tipo: 'Ordinaria', fecha: 'Viernes 19 de Septiembre 2026 — 18:00', titulo: 'Junta General Ordinaria' },
  { tipo: 'Extraordinaria', fecha: 'Lunes 1 de Junio 2026 — 19:00', titulo: 'Junta General Extraordinaria' },
  { tipo: 'Extraordinaria', fecha: 'Martes 10 de Febrero 2026 — 19:00', titulo: 'Junta General Extraordinaria' },
  { tipo: 'Extraordinaria', fecha: 'Miércoles 15 de Octubre 2026 — 19:00', titulo: 'Junta General Extraordinaria' },
];

export default function JuntasGeneralesPage() {
  return (
    <div className="page-in">
      <main className="max-w-[1180px] mx-auto px-6 flex flex-col gap-[22px] pb-10">
        <div className="pt-2">
          <p className="eyebrow">Comunidad</p>
          <h1 className="font-display text-[40px] font-medium text-cocoa mt-1" style={{ letterSpacing: '-0.02em' }}>
            Juntas Generales
          </h1>
        </div>

        <div className="glass p-[26px]">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
              <Icon name="users" size={14} className="text-cream" />
            </div>
            <span className="eyebrow">Juntas de vecinos</span>
          </div>

          <div className="overflow-x-auto -mx-2">
            <table className="table-glass">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th>Título</th>
                  <th className="text-right">Acta</th>
                </tr>
              </thead>
              <tbody>
                {JUNTAS.map((j, i) => (
                  <tr key={i} className="row-stagger" style={{ animationDelay: `${i * 40}ms` }}>
                    <td>
                      <span className={`text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md ${j.tipo === 'Ordinaria' ? 'text-sage bg-sage/8' : 'text-accent bg-accent/10'}`}>
                        {j.tipo}
                      </span>
                    </td>
                    <td className="text-sm text-cocoa/70">{j.fecha}</td>
                    <td className="text-sm font-medium text-cocoa">{j.titulo}</td>
                    <td className="text-right">
                      <button
                        disabled
                        className="btn btn-ghost text-xs opacity-40 cursor-default"
                      >
                        <Icon name="download" size={12} />
                        Próximamente
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass p-[26px]">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#6f8a5c' }}>
              <Icon name="users" size={14} className="text-cream" />
            </div>
            <span className="eyebrow">Juntas de vocales</span>
          </div>

          <div className="overflow-x-auto -mx-2">
            <table className="table-glass">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th>Título</th>
                  <th className="text-right">Acta</th>
                </tr>
              </thead>
              <tbody>
                {JUNTAS.map((j, i) => (
                  <tr key={i} className="row-stagger" style={{ animationDelay: `${i * 40}ms` }}>
                    <td>
                      <span className={`text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md ${j.tipo === 'Ordinaria' ? 'text-sage bg-sage/8' : 'text-accent bg-accent/10'}`}>
                        {j.tipo}
                      </span>
                    </td>
                    <td className="text-sm text-cocoa/70">{j.fecha}</td>
                    <td className="text-sm font-medium text-cocoa">{j.titulo}</td>
                    <td className="text-right">
                      <button
                        disabled
                        className="btn btn-ghost text-xs opacity-40 cursor-default"
                      >
                        <Icon name="download" size={12} />
                        Próximamente
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
