import Icon from './Icon';
import Sparkline from './Sparkline';

interface ConsumoActual {
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
  sparkline_calor?: number[];
  sparkline_frio?: number[];
  sparkline_acs?: number[];
}

function deltaStr(desdeInicio: number | null, decimals: number): string {
  if (desdeInicio == null || isNaN(desdeInicio)) return '';
  return `+${desdeInicio.toLocaleString('es-ES', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })} desde inicio de mes`;
}

export default function ConsumoCard({ data }: { data: ConsumoActual | null }) {
  const isLive = data?.power_w != null && Number(data.power_w) > 0;

  if (!data) {
    return (
      <div className="glass glass-hover p-[26px]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
            <Icon name="activity" size={14} className="text-cream" />
          </div>
          <span className="eyebrow">Contadores de Aerotermia en vivo</span>
        </div>
        <div className="text-sm text-cocoa/44">Esperando datos del contador...</div>
      </div>
    );
  }

  return (
    <div className="glass glass-hover p-[26px] scroll-mt-20" id="envivo">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
          <Icon name="activity" size={14} className="text-cream" />
        </div>
        <span className="eyebrow">Contadores de Aerotermia en vivo</span>
        <span className="ml-auto text-cocoa/30 text-xs">
          {new Date(data.timestamp).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-cocoa/40 mb-1">Calefacción</div>
          <div className="font-display text-[28px] font-medium leading-none" style={{ letterSpacing: '-0.02em', color: 'var(--calor)' }}>
            {Number(data.kwh_calor_abs).toLocaleString('es-ES', { maximumFractionDigits: 0 })}
          </div>
          <div className="font-mono text-[11px] text-cocoa/40 font-num mt-0.5">kWh</div>
          {data.sparkline_calor && <div className="mt-1"><Sparkline data={data.sparkline_calor} color="var(--calor)" /></div>}
          <div className="text-[11px] mt-1 opacity-50" style={{ color: 'var(--calor)' }}>
            {deltaStr(data.kwh_calor_mes_inicio, 0)}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-cocoa/40 mb-1">Refrigeración</div>
          <div className="font-display text-[28px] font-medium leading-none" style={{ letterSpacing: '-0.02em', color: 'var(--frio)' }}>
            {Number(data.kwh_frio_abs).toLocaleString('es-ES', { maximumFractionDigits: 0 })}
          </div>
          <div className="font-mono text-[11px] text-cocoa/40 font-num mt-0.5">kWh</div>
          {data.sparkline_frio && <div className="mt-1"><Sparkline data={data.sparkline_frio} color="var(--frio)" /></div>}
          <div className="text-[11px] mt-1 opacity-50" style={{ color: 'var(--frio)' }}>
            {deltaStr(data.kwh_frio_mes_inicio, 0)}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-cocoa/40 mb-1">ACS</div>
          <div className="font-display text-[28px] font-medium leading-none" style={{ letterSpacing: '-0.02em', color: 'var(--sage)' }}>
            {Number(data.m3_acs_abs).toLocaleString('es-ES', { maximumFractionDigits: 2 })}
          </div>
          <div className="font-mono text-[11px] text-cocoa/40 font-num mt-0.5">m³</div>
          {data.sparkline_acs && <div className="mt-1"><Sparkline data={data.sparkline_acs} color="var(--sage)" /></div>}
          <div className="text-[11px] mt-1 opacity-50" style={{ color: 'var(--sage)' }}>
            {deltaStr(data.m3_acs_mes_inicio, 1)}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-cocoa/40 mb-1">Estado</div>
          <div className="flex items-center gap-1.5 mb-1">
            {isLive ? (
              <>
                <span className="live-dot" style={{ display: 'inline-block' }} />
                <span className="text-[13px] font-medium" style={{ color: '#5b7a4a' }}>Encendido</span>
              </>
            ) : (
              <>
                <span className="w-[7px] h-[7px] rounded-full" style={{ display: 'inline-block', background: 'rgba(58,47,36,.25)' }} />
                <span className="text-[13px] font-medium" style={{ color: '#a3402a' }}>Apagado</span>
              </>
            )}
          </div>
          {isLive && (
            <div className="font-mono text-[11px] text-cocoa/40 font-num mt-0.5">
              {`${Number(data.power_w).toFixed(0)} W`}
            </div>
          )}
          <div className="text-[11px] text-cocoa/40 mt-1">
            Impulsion: <span className="text-rise font-medium">{data.temp_impulsion != null ? `${Number(data.temp_impulsion).toFixed(1)}°C` : '—'}</span>
          </div>
          <div className="text-[11px] text-cocoa/40">
            Retorno: <span className="text-sage font-medium">{data.temp_retorno != null ? `${Number(data.temp_retorno).toFixed(1)}°C` : '—'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
