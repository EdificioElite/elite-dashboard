import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import Icon from './Icon';

interface GlobalEnVivo {
  timestamp: string;
  kwh_calor_abs: number;
  kwh_frio_abs: number;
  m3_acs_abs: number;
  kwh_calor_mes_inicio: number;
  kwh_frio_mes_inicio: number;
  m3_acs_mes_inicio: number;
  temp_impulsion_avg: number;
  temp_impulsion_max: number;
  temp_impulsion_min: number;
  temp_retorno_avg: number;
  temp_retorno_max: number;
  temp_retorno_min: number;
  modo: 'calefaccion' | 'refrigeracion' | 'desconocido';
  power_w_total: number;
}

function fmtNum(value: number, decimals: number): string {
  return value.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function modoBadge(modo: string) {
  switch (modo) {
    case 'calefaccion':
      return <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: '#fef2f2', color: '#B53228' }}><span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#B53228' }} />Calefacción</span>;
    case 'refrigeracion':
      return <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: '#eff6ff', color: '#3b82f6' }}><span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#3b82f6' }} />Refrigeración</span>;
    default:
      return <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: '#f3f4f6', color: '#6b7280' }}><span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#6b7280' }} />Desconocido</span>;
  }
}

export default function GlobalEnVivoCard() {
  const [data, setData] = useState<GlobalEnVivo | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      try {
        const res = await apiFetch<GlobalEnVivo | null>('/admin/aerotermia/en-vivo');
        if (!cancelled) setData(res);
      } catch { /* silencioso */ }
    }
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!data) {
    return (
      <div className="glass p-[26px]" aria-label="Aerotermia global en vivo">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
            <Icon name="zap" size={15} className="text-cream" />
          </div>
          <div>
            <p className="eyebrow">Aerotermia Global en Vivo</p>
            <p className="text-xs text-cocoa/40 mt-0.5">Todos los vecinos · Total edificio</p>
          </div>
        </div>
        <p className="text-sm text-cocoa/40 mt-4">Esperando datos de los contadores...</p>
      </div>
    );
  }

  return (
    <div className="glass p-[26px]" aria-label="Aerotermia global en vivo">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
            <Icon name="zap" size={15} className="text-cream" />
          </div>
          <div>
            <p className="eyebrow">Aerotermia Global en Vivo</p>
            <p className="text-xs text-cocoa/40 mt-0.5">Todos los vecinos · Total edificio</p>
          </div>
        </div>
        <span className="text-[11px] text-cocoa/30 font-mono">
          {new Date(data.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Calefacción */}
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-cocoa/40 font-medium mb-1">Calefacción</p>
          <p className="text-[22px] font-bold font-num leading-none" style={{ color: 'var(--calor)' }}>
            {fmtNum(data.kwh_calor_abs, 1)}
          </p>
          <p className="text-[10px] text-cocoa/40 mt-0.5">kWh</p>
          {data.kwh_calor_mes_inicio > 0 && (
            <p className="text-[10px] mt-1" style={{ color: 'var(--sage)' }}>
              +{fmtNum(data.kwh_calor_mes_inicio, 1)} desde inicio mes
            </p>
          )}
        </div>

        {/* Refrigeración */}
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-cocoa/40 font-medium mb-1">Refrigeración</p>
          <p className="text-[22px] font-bold font-num leading-none" style={{ color: 'var(--frio)' }}>
            {fmtNum(data.kwh_frio_abs, 1)}
          </p>
          <p className="text-[10px] text-cocoa/40 mt-0.5">kWh</p>
          {data.kwh_frio_mes_inicio > 0 && (
            <p className="text-[10px] mt-1" style={{ color: 'var(--sage)' }}>
              +{fmtNum(data.kwh_frio_mes_inicio, 1)} desde inicio mes
            </p>
          )}
        </div>

        {/* ACS */}
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-cocoa/40 font-medium mb-1">ACS</p>
          <p className="text-[22px] font-bold font-num leading-none" style={{ color: 'var(--sage)' }}>
            {fmtNum(data.m3_acs_abs, 1)}
          </p>
          <p className="text-[10px] text-cocoa/40 mt-0.5">m³</p>
          {data.m3_acs_mes_inicio > 0 && (
            <p className="text-[10px] mt-1" style={{ color: 'var(--sage)' }}>
              +{fmtNum(data.m3_acs_mes_inicio, 1)} desde inicio mes
            </p>
          )}
        </div>

        {/* Climatización */}
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-cocoa/40 font-medium mb-1">Climatización</p>
          <div className="flex justify-center my-1.5">
            {modoBadge(data.modo)}
          </div>
          <p className="text-[10px] text-cocoa/40 mt-0.5">
            Impulsión media {data.temp_impulsion_avg?.toFixed(1)}°C
          </p>
        </div>

        {/* Temperaturas */}
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-cocoa/40 font-medium mb-1">Temperaturas</p>
          <div className="space-y-1 mt-1">
            <p className="text-[12px] text-cocoa">
              <span className="text-cocoa/30 mr-1">↑</span>
              {data.temp_impulsion_max?.toFixed(1)}° máx
            </p>
            <p className="text-[12px] text-cocoa">
              <span className="text-cocoa/30 mr-1">↓</span>
              {data.temp_impulsion_min?.toFixed(1)}° mín
            </p>
            <div className="my-1.5 border-t border-cocoa/5 w-8 mx-auto" />
            <p className="text-[12px] text-cocoa">
              <span className="text-cocoa/30 mr-1">↺</span>
              {data.temp_retorno_max?.toFixed(1)}° máx
            </p>
            <p className="text-[12px] text-cocoa">
              <span className="text-cocoa/30 mr-1">↻</span>
              {data.temp_retorno_min?.toFixed(1)}° mín
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
