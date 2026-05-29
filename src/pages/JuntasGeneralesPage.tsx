import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/auth';
import { fetchJuntas, downloadJuntaPDF } from '../api/client';
import CreateJuntaModal from '../components/CreateJuntaModal';
import EditJuntaModal from '../components/EditJuntaModal';
import DeleteJuntaModal from '../components/DeleteJuntaModal';
import Icon from '../components/Icon';

interface Junta {
  id: number;
  tipo: string;
  fecha: string;
  file_name: string | null;
  created_at: string;
  updated_at: string;
}

const TIPO_LABELS: Record<string, string> = {
  vecinal_ordinaria: 'Vecinal Ordinaria',
  vecinal_extraordinaria: 'Vecinal Extraordinaria',
  vocal_ordinaria: 'Directiva Ordinaria',
  vocal_extraordinaria: 'Directiva Extraordinaria',
};

function tipoLabel(tipo: string): string {
  return TIPO_LABELS[tipo] || tipo;
}

function tipoBadgeClass(tipo: string): string {
  if (tipo.includes('extraordinaria')) {
    return 'text-accent bg-accent/10';
  }
  return 'text-sage bg-sage/8';
}

function isVocal(tipo: string): boolean {
  return tipo.startsWith('vocal');
}

function fmtFecha(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function JuntasGeneralesPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.is_admin ?? false;

  const [juntas, setJuntas] = useState<Junta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingJunta, setEditingJunta] = useState<Junta | null>(null);
  const [deletingJunta, setDeletingJunta] = useState<Junta | null>(null);

  const loadJuntas = useCallback(async () => {
    try {
      setError('');
      const data = await fetchJuntas();
      setJuntas(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar juntas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJuntas();
  }, [loadJuntas]);

  const handleDownload = async (junta: Junta) => {
    setDownloading(junta.id);
    try {
      await downloadJuntaPDF(junta.id);
    } catch (err: any) {
      setError(err.message || 'Error al descargar');
    } finally {
      setDownloading(null);
    }
  };

  const handleCreated = () => {
    setShowCreate(false);
    loadJuntas();
  };

  const handleEdited = () => {
    setEditingJunta(null);
    loadJuntas();
  };

  const handleDeleted = () => {
    setDeletingJunta(null);
    loadJuntas();
  };

  const vecinales = juntas.filter((j) => !isVocal(j.tipo));
  const vocales = juntas.filter((j) => isVocal(j.tipo));

  if (loading) {
    return (
      <div className="page-in">
        <div className="max-w-[1180px] mx-auto px-6 py-20 text-center">
          <p className="text-cocoa/40">Cargando juntas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-in">
      <main className="max-w-[1180px] mx-auto px-6 flex flex-col gap-[22px] pb-10">
        <div className="pt-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Comunidad</p>
              <h1 className="font-display text-[40px] font-medium text-cocoa mt-1" style={{ letterSpacing: '-0.02em' }}>
                Juntas
              </h1>
              <p className="text-sm text-cocoa/50 mt-1">Edificio Elite — C.P. Pio Rio Hortega 46</p>
            </div>
            {isAdmin && (
              <button onClick={() => setShowCreate(true)} className="btn btn-primary">
                <Icon name="plus" size={14} />
                Crear junta
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(163,64,42,.08)', color: '#a3402a' }}>
            <Icon name="alertTriangle" size={14} />
            {error}
          </div>
        )}

        <div className="glass p-[26px]">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
              <Icon name="users" size={14} className="text-cream" />
            </div>
            <span className="eyebrow">Vecinales — Juntas Generales</span>
          </div>

          {vecinales.length === 0 ? (
            <p className="text-sm text-cocoa/40 py-4">No hay juntas vecinales registradas.</p>
          ) : (
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
                  {vecinales.map((j, i) => (
                    <tr key={j.id} className="row-stagger" style={{ animationDelay: `${i * 30}ms` }}>
                      <td>
                        <span className={`text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md inline-flex items-center gap-2 ${tipoBadgeClass(j.tipo)}`}>
                          {tipoLabel(j.tipo).replace('Vecinal ', '').replace('Directiva ', '')}
                          {isAdmin && (
                            <span className="inline-flex items-center gap-0.5">
                              <button
                                onClick={() => setEditingJunta(j)}
                                className="hover:opacity-70 p-0.5"
                                title="Editar junta"
                              >
                                <Icon name="edit" size={12} />
                              </button>
                              <button
                                onClick={() => setDeletingJunta(j)}
                                className="hover:opacity-70 p-0.5"
                                title="Eliminar junta"
                              >
                                <Icon name="trash" size={12} />
                              </button>
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="text-sm text-cocoa/70">{fmtFecha(j.fecha)}</td>
                      <td className="text-right">
                        {j.file_name ? (
                          <button
                            onClick={() => handleDownload(j)}
                            disabled={downloading === j.id}
                            className="btn btn-ghost text-xs"
                          >
                            <Icon name="download" size={12} />
                            {downloading === j.id ? 'Descargando...' : 'Descargar'}
                          </button>
                        ) : (
                          <span className="text-xs text-cocoa/30">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="glass p-[26px]">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#6f8a5c' }}>
              <Icon name="users" size={14} className="text-cream" />
            </div>
            <span className="eyebrow">Vocales — Juntas de Junta Directiva</span>
          </div>

          {vocales.length === 0 ? (
            <p className="text-sm text-cocoa/40 py-4">No hay juntas de directiva registradas.</p>
          ) : (
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
                  {vocales.map((j, i) => (
                    <tr key={j.id} className="row-stagger" style={{ animationDelay: `${i * 30}ms` }}>
                      <td>
                        <span className={`text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md inline-flex items-center gap-2 ${tipoBadgeClass(j.tipo)}`}>
                          {tipoLabel(j.tipo).replace('Vecinal ', '').replace('Directiva ', '')}
                          {isAdmin && (
                            <span className="inline-flex items-center gap-0.5">
                              <button
                                onClick={() => setEditingJunta(j)}
                                className="hover:opacity-70 p-0.5"
                                title="Editar junta"
                              >
                                <Icon name="edit" size={12} />
                              </button>
                              <button
                                onClick={() => setDeletingJunta(j)}
                                className="hover:opacity-70 p-0.5"
                                title="Eliminar junta"
                              >
                                <Icon name="trash" size={12} />
                              </button>
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="text-sm text-cocoa/70">{fmtFecha(j.fecha)}</td>
                      <td className="text-right">
                        {j.file_name ? (
                          <button
                            onClick={() => handleDownload(j)}
                            disabled={downloading === j.id}
                            className="btn btn-ghost text-xs"
                          >
                            <Icon name="download" size={12} />
                            {downloading === j.id ? 'Descargando...' : 'Descargar'}
                          </button>
                        ) : (
                          <span className="text-xs text-cocoa/30">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showCreate && (
        <CreateJuntaModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {editingJunta && (
        <EditJuntaModal
          junta={editingJunta}
          onClose={() => setEditingJunta(null)}
          onUpdated={handleEdited}
        />
      )}

      {deletingJunta && (
        <DeleteJuntaModal
          junta={deletingJunta}
          onClose={() => setDeletingJunta(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
