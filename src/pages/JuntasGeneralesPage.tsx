import Icon from '../components/Icon';

interface JuntaVecinal {
  tipo: 'Ordinaria' | 'Extraordinaria';
  fecha: string;
}

interface JuntaVocal {
  tipo: 'Ordinaria';
  fecha: string;
}

const VECINALES: JuntaVecinal[] = [
  { tipo: 'Ordinaria', fecha: '2022-09-01' },
  { tipo: 'Extraordinaria', fecha: '2022-10-13' },
  { tipo: 'Extraordinaria', fecha: '2023-03-08' },
  { tipo: 'Extraordinaria', fecha: '2023-04-11' },
  { tipo: 'Ordinaria', fecha: '2023-10-04' },
  { tipo: 'Extraordinaria', fecha: '2023-12-04' },
  { tipo: 'Extraordinaria', fecha: '2024-05-16' },
  { tipo: 'Extraordinaria', fecha: '2024-06-08' },
  { tipo: 'Ordinaria', fecha: '2024-10-03' },
  { tipo: 'Extraordinaria', fecha: '2024-10-14' },
  { tipo: 'Extraordinaria', fecha: '2024-12-16' },
  { tipo: 'Extraordinaria', fecha: '2025-05-22' },
  { tipo: 'Extraordinaria', fecha: '2025-05-29' },
  { tipo: 'Extraordinaria', fecha: '2025-07-07' },
  { tipo: 'Ordinaria', fecha: '2025-09-25' },
  { tipo: 'Extraordinaria', fecha: '2026-02-12' },
];

const VOCALES: JuntaVocal[] = [
  { tipo: 'Ordinaria', fecha: '2025-06-12' },
  { tipo: 'Ordinaria', fecha: '2025-08-04' },
  { tipo: 'Ordinaria', fecha: '2025-09-10' },
  { tipo: 'Ordinaria', fecha: '2025-10-08' },
  { tipo: 'Ordinaria', fecha: '2025-11-17' },
  { tipo: 'Ordinaria', fecha: '2026-03-25' },
];

function fmtFecha(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function JuntasGeneralesPage() {
  return (
    <div className="page-in">
      <main className="max-w-[1180px] mx-auto px-6 flex flex-col gap-[22px] pb-10">
        <div className="pt-2">
          <p className="eyebrow">Comunidad</p>
          <h1 className="font-display text-[40px] font-medium text-cocoa mt-1" style={{ letterSpacing: '-0.02em' }}>
            Juntas
          </h1>
          <p className="text-sm text-cocoa/50 mt-1">Edificio Elite — C.P. Pio Rio Hortega 46</p>
        </div>

        <div className="glass p-[26px]">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
              <Icon name="users" size={14} className="text-cream" />
            </div>
            <span className="eyebrow">Vecinales — Juntas Generales</span>
          </div>

          <div className="overflow-x-auto -mx-2">
            <table className="table-glass">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th className="text-right">Acta</th>
                </tr>
              </thead>
              <tbody>
                {VECINALES.map((j, i) => (
                  <tr key={i} className="row-stagger" style={{ animationDelay: `${i * 30}ms` }}>
                    <td>
                      <span className={`text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md ${j.tipo === 'Ordinaria' ? 'text-sage bg-sage/8' : 'text-accent bg-accent/10'}`}>
                        {j.tipo}
                      </span>
                    </td>
                    <td className="text-sm text-cocoa/70">{fmtFecha(j.fecha)}</td>
                    <td className="text-right">
                      <button
                        disabled
                        className="btn btn-ghost text-xs opacity-40 cursor-default"
                      >
                        <Icon name="download" size={12} />
                        Proximamente
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
            <span className="eyebrow">Vocales — Juntas de Junta Directiva</span>
          </div>

          <div className="overflow-x-auto -mx-2">
            <table className="table-glass">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th className="text-right">Acta</th>
                </tr>
              </thead>
              <tbody>
                {VOCALES.map((j, i) => (
                  <tr key={i} className="row-stagger" style={{ animationDelay: `${i * 30}ms` }}>
                    <td>
                      <span className="text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md text-sage bg-sage/8">
                        {j.tipo}
                      </span>
                    </td>
                    <td className="text-sm text-cocoa/70">{fmtFecha(j.fecha)}</td>
                    <td className="text-right">
                      <button
                        disabled
                        className="btn btn-ghost text-xs opacity-40 cursor-default"
                      >
                        <Icon name="download" size={12} />
                        Proximamente
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
