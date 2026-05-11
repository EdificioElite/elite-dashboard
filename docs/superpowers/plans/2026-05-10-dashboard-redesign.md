# Dashboard Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar el dashboard del vecino con header navegable, tarjeta En vivo con deltas, 3 gráficas separadas, gráfica de facturas apiladas y tabla alineada.

**Architecture:** Se crean 2 nuevos componentes (`HistoricoCharts`, `FacturasChart`), se elimina `ConsumoChart`, se modifican `ConsumoCard`, `Header`, `FacturasTable` y `DashboardPage`. El backend extiende `/consumo-actual` con valores del inicio de mes.

**Tech Stack:** React + TypeScript + Recharts + Tailwind CSS + Express + PostgreSQL

---

### File Structure

| File | Responsibility |
|------|---------------|
| `api/src/routes/consumos.ts` | Extender endpoint `/consumo-actual` con campos `_mes_inicio` |
| `src/components/Header.tsx` | Nav links con scroll + dropdown de usuario |
| `src/components/ConsumoCard.tsx` | 4 columnas: Calor, Frio, ACS, Estado + deltas |
| `src/components/HistoricoCharts.tsx` | **NUEVO** — 3 gráficas en una card, control compartido |
| `src/components/ConsumoChart.tsx` | **ELIMINAR** — reemplazado por HistoricoCharts |
| `src/components/FacturasChart.tsx` | **NUEVO** — barras apiladas con tooltip detallado |
| `src/components/FacturasTable.tsx` | Corregir alineación de columna Importe |
| `src/pages/DashboardPage.tsx` | Reorganizar secciones + IDs para scroll |
| `src/pages/AdminVecinoPage.tsx` | Cambiar ConsumoChart → HistoricoCharts |
| `src/components/ConsumoCard.test.tsx` | Actualizar tests con deltas y columna Estado |
| `src/components/ConsumoChart.test.tsx` | **ELIMINAR** |
| `e2e/specs/dashboard.spec.ts` | Actualizar textos |
| `e2e/specs/date-range.spec.ts` | Actualizar para HistoricoCharts |

---

### Task 1: Backend — Extender `/consumo-actual` con valores de inicio de mes

**Files:**
- Modify: `api/src/routes/consumos.ts`

- [ ] **Step 1: Añadir subquery para obtener el valor del día 1 del mes a las 00:00**

```typescript
// En api/src/routes/consumos.ts, reemplazar el endpoint /consumo-actual:

router.get('/consumo-actual', authMiddleware, async (req: Request, res: Response) => {
  try {
    const vecinoPiso = req.user!.vecinoPiso;

    const result = await query(
      `WITH latest AS (
        SELECT
          ct.datetime_inst_value_0_0_0 AS timestamp,
          ct.energy_wh_inst_value_0_0_0,
          ct.energy_manufacturer_specific_02_wh_inst_value_0_0_0,
          ct.volume_m3_inst_value_0_1_0,
          ct.flow_temp_c_inst_value_0_0_0 AS temp_impulsion,
          ct.return_temp_c_inst_value_0_0_0 AS temp_retorno,
          ct.power_w_inst_value_0_0_0 AS power_w,
          LAG(ct.energy_wh_inst_value_0_0_0) OVER (ORDER BY ct.datetime_inst_value_0_0_0) AS prev_wh_calor,
          LAG(ct.energy_manufacturer_specific_02_wh_inst_value_0_0_0) OVER (ORDER BY ct.datetime_inst_value_0_0_0) AS prev_wh_frio,
          LAG(ct.volume_m3_inst_value_0_1_0) OVER (ORDER BY ct.datetime_inst_value_0_0_0) AS prev_m3_acs
        FROM contadores ct
        JOIN vecinos v ON ct.device_identification = v.device_identification
          AND ct.serial_number::text = v.serial_number
        WHERE v.piso = $1
        ORDER BY ct.datetime_inst_value_0_0_0 DESC
      ),
      mes_inicio AS (
        SELECT
          ct.energy_wh_inst_value_0_0_0 AS calor_mes,
          ct.energy_manufacturer_specific_02_wh_inst_value_0_0_0 AS frio_mes,
          ct.volume_m3_inst_value_0_1_0 AS m3_acs_mes
        FROM contadores ct
        JOIN vecinos v ON ct.device_identification = v.device_identification
          AND ct.serial_number::text = v.serial_number
        WHERE v.piso = $1
          AND ct.datetime_inst_value_0_0_0 <= date_trunc('month', NOW())
        ORDER BY ct.datetime_inst_value_0_0_0 DESC
        LIMIT 1
      )
      SELECT
        timestamp,
        ROUND((energy_wh_inst_value_0_0_0 - prev_wh_calor) / 1000.0, 3) AS kwh_calor,
        ROUND((energy_manufacturer_specific_02_wh_inst_value_0_0_0 - prev_wh_frio) / 1000.0, 3) AS kwh_frio,
        ROUND((volume_m3_inst_value_0_1_0 - prev_m3_acs)::numeric, 3) AS m3_acs,
        ROUND(((volume_m3_inst_value_0_1_0 - prev_m3_acs) * 46.5)::numeric, 3) AS kwh_acs,
        (SELECT ROUND((energy_wh_inst_value_0_0_0 - calor_mes) / 1000.0, 3) FROM mes_inicio) AS kwh_calor_mes_inicio,
        (SELECT ROUND((energy_manufacturer_specific_02_wh_inst_value_0_0_0 - frio_mes) / 1000.0, 3) FROM mes_inicio) AS kwh_frio_mes_inicio,
        (SELECT ROUND((volume_m3_inst_value_0_1_0 - m3_acs_mes)::numeric, 3) FROM mes_inicio) AS m3_acs_mes_inicio,
        temp_impulsion,
        temp_retorno,
        power_w
      FROM latest
      WHERE prev_wh_calor IS NOT NULL
      LIMIT 1`,
      [vecinoPiso]
    );

    if (result.rows.length === 0) {
      res.json(null);
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Consumo actual error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
```

- [ ] **Step 2: Verificar que compila**

```bash
cd api && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Ejecutar tests de integración**

```bash
cd api && npm test -- --run
```

Expected: 35 tests pass.

- [ ] **Step 4: Commit**

```bash
git add api/src/routes/consumos.ts
git commit -m "feat: extender /consumo-actual con valores de inicio de mes para deltas"
```

---

### Task 2: ConsumoCard — 4 columnas con deltas y Estado

**Files:**
- Modify: `src/components/ConsumoCard.tsx`

- [ ] **Step 1: Actualizar interfaz y layout**

```tsx
import Icon from './Icon';

interface ConsumoActual {
  timestamp: string;
  kwh_calor: number;
  kwh_frio: number;
  m3_acs: number;
  kwh_acs: number;
  kwh_calor_mes_inicio: number | null;
  kwh_frio_mes_inicio: number | null;
  m3_acs_mes_inicio: number | null;
  temp_impulsion: number | null;
  temp_retorno: number | null;
  power_w: number | null;
}

function deltaStr(actual: number, inicio: number | null, decimals: number): string {
  if (inicio == null || isNaN(inicio)) return '';
  const d = actual - inicio;
  return `+${d.toFixed(decimals)} desde inicio de mes`;
}

export default function ConsumoCard({ data }: { data: ConsumoActual | null }) {
  const isLive = data?.power_w != null && Number(data.power_w) > 0;

  if (!data) {
    return (
      <div className="glass p-[26px]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
            <Icon name="activity" size={14} className="text-cream" />
          </div>
          <span className="eyebrow">En vivo</span>
        </div>
        <div className="text-sm text-cocoa/44">Esperando datos del contador...</div>
      </div>
    );
  }

  return (
    <div className="glass p-[26px]" id="envivo">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
          <Icon name="activity" size={14} className="text-cream" />
        </div>
        <span className="eyebrow">En vivo</span>
        <span className="ml-auto text-cocoa/30 text-xs">
          {new Date(data.timestamp).toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-cocoa/40 mb-1">Calor</div>
          <div className="font-display text-[28px] font-medium leading-none" style={{ letterSpacing: '-0.02em', color: 'var(--calor)' }}>
            {Number(data.kwh_calor).toFixed(2)}
          </div>
          <div className="font-mono text-[11px] text-cocoa/40 font-num mt-0.5">kWh</div>
          <div className="text-[11px] mt-1 opacity-50" style={{ color: 'var(--calor)' }}>
            {deltaStr(Number(data.kwh_calor), data.kwh_calor_mes_inicio, 2)}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-cocoa/40 mb-1">Frio</div>
          <div className="font-display text-[28px] font-medium leading-none" style={{ letterSpacing: '-0.02em', color: 'var(--frio)' }}>
            {Number(data.kwh_frio).toFixed(2)}
          </div>
          <div className="font-mono text-[11px] text-cocoa/40 font-num mt-0.5">kWh</div>
          <div className="text-[11px] mt-1 opacity-50" style={{ color: 'var(--frio)' }}>
            {deltaStr(Number(data.kwh_frio), data.kwh_frio_mes_inicio, 2)}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-cocoa/40 mb-1">ACS</div>
          <div className="font-display text-[28px] font-medium leading-none" style={{ letterSpacing: '-0.02em', color: 'var(--sage)' }}>
            {Number(data.m3_acs).toFixed(3)}
          </div>
          <div className="font-mono text-[11px] text-cocoa/40 font-num mt-0.5">m³ / {Number(data.kwh_acs).toFixed(2)} kWh</div>
          <div className="text-[11px] mt-1 opacity-50" style={{ color: 'var(--sage)' }}>
            {deltaStr(Number(data.m3_acs), data.m3_acs_mes_inicio, 3)}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-cocoa/40 mb-1">Estado</div>
          <div className="font-display text-[28px] font-medium leading-none" style={{ letterSpacing: '-0.02em' }}>
            {isLive ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="live-dot" />
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="w-[7px] h-[7px] rounded-full" style={{ background: 'rgba(58,47,36,.25)' }} />
              </span>
            )}
          </div>
          <div className="font-mono text-[11px] text-cocoa/40 font-num mt-0.5">
            {isLive ? `${Number(data.power_w).toFixed(0)} W` : 'Apagado'}
          </div>
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
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Expected: No errors.

- [ ] **Step 3: Ejecutar tests de frontend**

```bash
npm test -- --run
```

Expected: Algunos tests de ConsumoCard fallarán porque la interfaz cambió. Los arreglamos en Task 3.

- [ ] **Step 4: Commit**

```bash
git add src/components/ConsumoCard.tsx
git commit -m "feat: ConsumoCard con 4 columnas y deltas mensuales"
```

---

### Task 3: Actualizar tests de ConsumoCard

**Files:**
- Modify: `src/components/ConsumoCard.test.tsx`

- [ ] **Step 1: Actualizar tests con los nuevos campos**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConsumoCard from './ConsumoCard';

describe('ConsumoCard', () => {
  it('shows empty state when data is null', () => {
    render(<ConsumoCard data={null} />);
    expect(screen.getByText('Esperando datos del contador...')).toBeInTheDocument();
  });

  it('displays calor, frio, ACS and Estado columns', () => {
    render(
      <ConsumoCard
        data={{
          timestamp: '2026-01-01T12:00:00Z',
          kwh_calor: 12.34, kwh_frio: 3.21, m3_acs: 0.12, kwh_acs: 5.67,
          kwh_calor_mes_inicio: 9.13, kwh_frio_mes_inicio: 2.76, m3_acs_mes_inicio: 0.117,
          temp_impulsion: 42, temp_retorno: 32, power_w: 150,
        }}
      />
    );
    expect(screen.getByText('12.34')).toBeInTheDocument();
    expect(screen.getByText('3.21')).toBeInTheDocument();
    expect(screen.getByText('0.120')).toBeInTheDocument();
    expect(screen.getByText('Calor')).toBeInTheDocument();
    expect(screen.getByText('Frio')).toBeInTheDocument();
    expect(screen.getByText('ACS')).toBeInTheDocument();
    expect(screen.getByText('Estado')).toBeInTheDocument();
    expect(screen.getByText('+3.21 desde inicio de mes')).toBeInTheDocument();
    expect(screen.getByText('+0.45 desde inicio de mes')).toBeInTheDocument();
    expect(screen.getByText('+0.003 desde inicio de mes')).toBeInTheDocument();
  });

  it('shows live status when power is active', () => {
    render(
      <ConsumoCard
        data={{
          timestamp: '2026-05-09T10:30:00Z', kwh_calor: 1, kwh_frio: 0, m3_acs: 0.01, kwh_acs: 2,
          kwh_calor_mes_inicio: null, kwh_frio_mes_inicio: null, m3_acs_mes_inicio: null,
          temp_impulsion: null, temp_retorno: null, power_w: 150,
        }}
      />
    );
    expect(screen.getByText('En vivo')).toBeInTheDocument();
    expect(screen.getByText('150 W')).toBeInTheDocument();
  });

  it('shows apagado when power is null or zero', () => {
    render(
      <ConsumoCard
        data={{
          timestamp: '2026-05-09T10:30:00Z', kwh_calor: 1, kwh_frio: 0, m3_acs: 0.01, kwh_acs: 2,
          kwh_calor_mes_inicio: null, kwh_frio_mes_inicio: null, m3_acs_mes_inicio: null,
          temp_impulsion: null, temp_retorno: null, power_w: null,
        }}
      />
    );
    expect(screen.getByText('Apagado')).toBeInTheDocument();
  });

  it('shows temperatures when available', () => {
    render(
      <ConsumoCard
        data={{
          timestamp: '2026-05-09T10:30:00Z', kwh_calor: 1, kwh_frio: 0, m3_acs: 0.01, kwh_acs: 2,
          kwh_calor_mes_inicio: null, kwh_frio_mes_inicio: null, m3_acs_mes_inicio: null,
          temp_impulsion: 42, temp_retorno: 32, power_w: null,
        }}
      />
    );
    expect(screen.getByText('42.0°C')).toBeInTheDocument();
    expect(screen.getByText('32.0°C')).toBeInTheDocument();
  });

  it('hides delta when mes_inicio is null', () => {
    render(
      <ConsumoCard
        data={{
          timestamp: '2026-05-09T10:30:00Z', kwh_calor: 5, kwh_frio: 0, m3_acs: 0.01, kwh_acs: 2,
          kwh_calor_mes_inicio: null, kwh_frio_mes_inicio: null, m3_acs_mes_inicio: null,
          temp_impulsion: null, temp_retorno: null, power_w: null,
        }}
      />
    );
    expect(screen.queryByText(/desde inicio de mes/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Ejecutar tests**

```bash
npm test -- --run
```

Expected: All 23 tests pass (22 original + 1 new).

- [ ] **Step 3: Commit**

```bash
git add src/components/ConsumoCard.test.tsx
git commit -m "test: actualizar tests de ConsumoCard con deltas y Estado"
```

---

### Task 4: HistoricoCharts — 3 gráficas en una card

**Files:**
- Create: `src/components/HistoricoCharts.tsx`
- Delete: `src/components/ConsumoChart.tsx`
- Delete: `src/components/ConsumoChart.test.tsx`

- [ ] **Step 1: Crear HistoricoCharts.tsx**

```tsx
import { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { apiFetch } from '../api/client';
import SegmentedControl from './SegmentedControl';

interface Consumo {
  timestamp: string;
  kwh_calor: number;
  kwh_frio: number;
  m3_acs: number;
  kwh_acs: number;
}

type Preset = '24h' | '7d' | '30d' | '1a' | null;

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toLocalISO(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

function fromDatetimeLocal(val: string) {
  return val + ':00';
}

function applyPreset(preset: Preset): { desde: string; hasta: string } {
  const now = new Date();
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  switch (preset) {
    case '24h': start.setDate(start.getDate() - 1); return { desde: toLocalISO(start), hasta: toLocalISO(now) };
    case '7d': start.setDate(start.getDate() - 7); start.setHours(0, 0, 0, 0); return { desde: toLocalISO(start), hasta: toLocalISO(now) };
    case '30d': start.setDate(start.getDate() - 30); start.setHours(0, 0, 0, 0); return { desde: toLocalISO(start), hasta: toLocalISO(now) };
    case '1a': start.setFullYear(start.getFullYear() - 1); start.setHours(0, 0, 0, 0); return { desde: toLocalISO(start), hasta: toLocalISO(now) };
    default: start.setDate(start.getDate() - 7); start.setHours(0, 0, 0, 0); return { desde: toLocalISO(start), hasta: toLocalISO(now) };
  }
}

function xAxisFormat(iso: string, spanMs: number): string {
  const d = new Date(iso);
  if (spanMs <= 24 * 60 * 60 * 1000) return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  if (spanMs <= 7 * 24 * 60 * 60 * 1000) return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
  if (spanMs <= 90 * 24 * 60 * 60 * 1000) return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  return d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
}

const PRESETS = [
  { key: '24h', label: '24h' },
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '1a', label: '1 ano' },
];

const TOOLTIP_STYLE = {
  background: 'rgba(58,47,36,.92)',
  border: 'none',
  borderRadius: '10px',
  color: '#f5ecdc',
  fontSize: '11.5px',
  fontFamily: "'Manrope', sans-serif",
  padding: '10px 12px',
  boxShadow: '0 4px 16px rgba(0,0,0,.15)',
};

function computeDomain(values: number[]): [number, number] {
  const filtered = values.filter((v) => v != null && !isNaN(v));
  if (filtered.length === 0) return [0, 1];
  const min = Math.min(...filtered);
  const max = Math.max(...filtered);
  const range = max - min;
  const padding = Math.max(range * 0.15, 0.01);
  return [Math.max(0, min - padding), max + padding];
}

interface ChartLineProps {
  data: { label: string; value: number; timestamp: string }[];
  color: string;
  unit: string;
  dashed?: boolean;
  decimals?: number;
}

function ChartLine({ data, color, unit, dashed, decimals = 2 }: ChartLineProps) {
  const domain = useMemo(() => computeDomain(data.map((d) => d.value)), [data]);

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="rgba(58,47,36,.06)" vertical={false} />
        <XAxis dataKey="label" fontSize={10} tick={{ fill: 'rgba(58,47,36,.35)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis
          fontSize={10}
          tick={{ fill: 'rgba(58,47,36,.35)', fontFamily: "'JetBrains Mono', monospace" }}
          axisLine={false} tickLine={false}
          domain={domain}
          width={40}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value: number) => [`${Number(value).toFixed(decimals)} ${unit}`, '']}
          labelFormatter={(label: string) => {
            const item = data.find((d) => d.label === label);
            return item?.timestamp ? new Date(item.timestamp).toLocaleString('es-ES', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : label;
          }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          strokeDasharray={dashed ? '4 3' : undefined}
          dot={false}
          activeDot={{ r: 4, fill: '#fff8ee', stroke: color, strokeWidth: 1.5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function HistoricoCharts({ endpoint, title }: { endpoint?: string; title?: string }) {
  const [preset, setPreset] = useState<Preset>('7d');
  const [desdeInput, setDesdeInput] = useState('');
  const [hastaInput, setHastaInput] = useState('');
  const [data, setData] = useState<Consumo[]>([]);

  const setRange = (p: string) => {
    setPreset(p as Preset);
    if (p) {
      const { desde, hasta } = applyPreset(p as Preset);
      setDesdeInput(toDatetimeLocal(desde));
      setHastaInput(toDatetimeLocal(hasta));
    }
  };

  useEffect(() => { setRange('7d'); }, []);

  const desde = desdeInput ? fromDatetimeLocal(desdeInput) : '';
  const hasta = hastaInput ? fromDatetimeLocal(hastaInput) : '';

  useEffect(() => {
    if (!desde || !hasta) return;
    const base = endpoint || '/consumos';
    const qs = `?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`;
    apiFetch<Consumo[]>(`${base}${qs}`)
      .then(setData)
      .catch(() => setData([]));
  }, [desde, hasta, endpoint]);

  const spanMs = useMemo(() => {
    if (!desde || !hasta || data.length === 0) return 7 * 24 * 60 * 60 * 1000;
    return new Date(hasta).getTime() - new Date(desde).getTime();
  }, [desde, hasta, data]);

  const formatted = useMemo(
    () => data.map((d) => ({ timestamp: d.timestamp, label: xAxisFormat(d.timestamp, spanMs) })),
    [data, spanMs]
  );

  const calorData = useMemo(
    () => data.map((d, i) => ({ ...formatted[i], value: d.kwh_calor })),
    [data, formatted]
  );
  const frioData = useMemo(
    () => data.map((d, i) => ({ ...formatted[i], value: d.kwh_frio })),
    [data, formatted]
  );
  const acsData = useMemo(
    () => data.map((d, i) => ({ ...formatted[i], value: d.m3_acs })),
    [data, formatted]
  );

  return (
    <div className="glass p-[26px]">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff8ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
            </svg>
          </div>
          <span className="eyebrow">{title || 'Historico'}</span>
        </div>
        <SegmentedControl options={PRESETS} value={preset ?? ''} onChange={(k) => setRange(k)} />
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <label className="text-[11px] font-medium uppercase tracking-wider text-cocoa/40">Desde:</label>
        <input type="datetime-local" value={desdeInput} onChange={(e) => { setDesdeInput(e.target.value); setPreset(null); }} className="input-card text-xs py-1.5 px-3 w-auto" />
        <label className="text-[11px] font-medium uppercase tracking-wider text-cocoa/40">Hasta:</label>
        <input type="datetime-local" value={hastaInput} onChange={(e) => { setHastaInput(e.target.value); setPreset(null); }} className="input-card text-xs py-1.5 px-3 w-auto" />
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-cocoa/44 py-8">No hay datos en este periodo</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div id="calor">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--calor)' }} />
              <span className="text-[11px] font-medium text-cocoa/40 uppercase tracking-wider">Calor</span>
              <span className="text-[10px] text-cocoa/30 font-mono">kWh</span>
            </div>
            <ChartLine data={calorData} color="#c0392b" unit="kWh" />
          </div>
          <div id="frio">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--frio)' }} />
              <span className="text-[11px] font-medium text-cocoa/40 uppercase tracking-wider">Frio</span>
              <span className="text-[10px] text-cocoa/30 font-mono">kWh</span>
            </div>
            <ChartLine data={frioData} color="#5b8ba0" unit="kWh" />
          </div>
          <div id="acs">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--sage)' }} />
              <span className="text-[11px] font-medium text-cocoa/40 uppercase tracking-wider">ACS</span>
              <span className="text-[10px] text-cocoa/30 font-mono">m³</span>
            </div>
            <ChartLine data={acsData} color="#6f8a5c" unit="m³" dashed decimals={3} />
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/HistoricoCharts.tsx
git commit -m "feat: HistoricoCharts con 3 graficas separadas y control compartido"
```

---

### Task 5: FacturasChart — barras apiladas con tooltip

**Files:**
- Create: `src/components/FacturasChart.tsx`

- [ ] **Step 1: Crear FacturasChart.tsx**

```tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { fmtMoney } from '../lib/format';
import Icon from './Icon';

interface Factura {
  id_factura: string;
  periodo: string;
  importe_total: number;
  kwh_calor: number;
  kwh_frio: number;
  kwh_acs: number;
  m3_acs: number;
  importe_calor: number;
  importe_frio: number;
  importe_acs: number;
}

function fmtPeriodo(periodo: string): string {
  const d = new Date(periodo);
  return d.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
}

function tooltipContent(props: any) {
  const { active, payload } = props;
  if (!active || !payload || !payload[0]?.payload) return null;
  const f = payload[0].payload as Factura & { periodoLabel: string };

  return (
    <div style={{
      background: 'rgba(58,47,36,.92)',
      border: 'none',
      borderRadius: '10px',
      color: '#f5ecdc',
      fontSize: '11.5px',
      fontFamily: "'Manrope', sans-serif",
      padding: '10px 12px',
      boxShadow: '0 4px 16px rgba(0,0,0,.15)',
      minWidth: '190px',
    }}>
      <div style={{ fontWeight: 500, marginBottom: 6 }}>{f.periodoLabel}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', color: 'rgba(245,236,220,.7)' }}>
        <span><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#c0392b', marginRight: 5, verticalAlign: 'middle' }} />Calor</span>
        <span>{fmtMoney(f.importe_calor)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', color: 'rgba(245,236,220,.7)' }}>
        <span><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#5b8ba0', marginRight: 5, verticalAlign: 'middle' }} />Frio</span>
        <span>{fmtMoney(f.importe_frio)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', color: 'rgba(245,236,220,.7)' }}>
        <span><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#6f8a5c', marginRight: 5, verticalAlign: 'middle' }} />ACS</span>
        <span>{fmtMoney(f.importe_acs)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', color: 'rgba(245,236,220,.6)', fontSize: '10.5px', marginTop: 4 }}>
        <span>kWh calor</span><span>{f.kwh_calor}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', color: 'rgba(245,236,220,.6)', fontSize: '10.5px' }}>
        <span>kWh frio</span><span>{f.kwh_frio}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', color: 'rgba(245,236,220,.6)', fontSize: '10.5px' }}>
        <span>kWh ACS</span><span>{f.kwh_acs}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', color: 'rgba(245,236,220,.6)', fontSize: '10.5px' }}>
        <span>m³ ACS</span><span>{Number(f.m3_acs).toFixed(1)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '.5px solid rgba(245,236,220,.15)', marginTop: 4, paddingTop: 4, fontWeight: 500 }}>
        <span>Total</span><span>{fmtMoney(f.importe_total)}</span>
      </div>
    </div>
  );
}

export default function FacturasChart({ data }: { data: Factura[] }) {
  if (data.length === 0) {
    return (
      <div className="glass p-[26px]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
            <Icon name="dollar" size={14} className="text-cream" />
          </div>
          <span className="eyebrow">Facturas</span>
        </div>
        <p className="text-sm text-cocoa/44">No hay facturas disponibles</p>
      </div>
    );
  }

  const chartData = data
    .slice()
    .reverse()
    .map((f) => ({ ...f, periodoLabel: fmtPeriodo(f.periodo) }));

  return (
    <div className="glass p-[26px]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
          <Icon name="dollar" size={14} className="text-cream" />
        </div>
        <span className="eyebrow">Facturas</span>
      </div>

      <div className="flex items-center gap-4 mb-4 text-[11px] text-cocoa/40">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: '#c0392b' }} /> Calor
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: '#5b8ba0' }} /> Frio
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: '#6f8a5c' }} /> ACS
        </span>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="rgba(58,47,36,.06)" vertical={false} />
          <XAxis dataKey="periodoLabel" fontSize={10} tick={{ fill: 'rgba(58,47,36,.44)' }} axisLine={false} tickLine={false} interval={0} angle={-45} textAnchor="end" height={40} />
          <YAxis fontSize={10} tick={{ fill: 'rgba(58,47,36,.44)', fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} width={45} tickFormatter={(v: number) => `${v.toFixed(0)}`} />
          <Tooltip content={tooltipContent} cursor={{ fill: 'rgba(58,47,36,.04)' }} />
          <Bar dataKey="importe_calor" stackId="a" fill="#c0392b" radius={[0, 0, 0, 0]} />
          <Bar dataKey="importe_frio" stackId="a" fill="#5b8ba0" radius={[0, 0, 0, 0]} />
          <Bar dataKey="importe_acs" stackId="a" fill="#6f8a5c" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/FacturasChart.tsx
git commit -m "feat: FacturasChart con barras apiladas y tooltip detallado"
```

---

### Task 6: FacturasTable — alinear Importe

**Files:**
- Modify: `src/components/FacturasTable.tsx`

- [ ] **Step 1: Corregir alineación de la columna Importe**

```tsx
// Reemplazar la linea del <th> de Importe (linea 50) y el <td> de Importe (linea 61):

// En el thead, cambiar:
<th className="text-right">Importe</th>

// En el tbody, cambiar:
<td className="font-mono text-xs text-right font-medium font-num">{fmtMoney(f.importe_total)}</td>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/FacturasTable.tsx
git commit -m "fix: alinear columna Importe a la derecha en FacturasTable"
```

---

### Task 7: Header — navegación y dropdown

**Files:**
- Modify: `src/components/Header.tsx`

- [ ] **Step 1: Reemplazar Header con nav links + dropdown**

```tsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

interface HeaderProps {
  showAdmin?: boolean;
  showDashboard?: boolean;
  title?: string;
}

const NAV_ITEMS = [
  { label: 'En vivo', target: 'envivo' },
  { label: 'Calor', target: 'calor' },
  { label: 'Frio', target: 'frio' },
  { label: 'ACS', target: 'acs' },
  { label: 'Facturas', target: 'facturas' },
];

export default function Header({ showAdmin, showDashboard, title }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initials = (user?.vecino_piso || user?.email?.[0] || '?').substring(0, 2).toUpperCase();

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [open]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header
      className="sticky top-0 z-20 glass m-4 px-6 py-3 flex items-center justify-between"
      style={{ borderRadius: 'var(--radius-lg)', margin: '16px 24px' }}
    >
      <div className="flex items-center gap-4">
        <img
          src="/images/elite/Logotipo PNG.png"
          alt="Edificio Elite"
          className="h-8 w-auto"
        />
        {NAV_ITEMS.map((item) => (
          <button
            key={item.target}
            onClick={() => scrollTo(item.target)}
            className="text-[11.5px] font-medium uppercase tracking-[0.05em] text-cocoa/40 hover:text-cocoa hover:bg-accent/8 px-2 py-1 rounded-md transition-colors hidden md:inline"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        {showAdmin && user?.is_admin && (
          <button onClick={() => navigate('/admin')} className="btn btn-ghost text-xs">
            Admin
          </button>
        )}
        {showDashboard && (
          <button onClick={() => navigate('/dashboard')} className="btn btn-ghost text-xs">
            Mi dashboard
          </button>
        )}

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen(!open)}
            className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[11.5px] font-bold text-cream border-none cursor-pointer"
            style={{ background: 'linear-gradient(135deg, var(--accent-soft), var(--accent))' }}
            title={user?.email}
          >
            {initials}
          </button>

          {open && (
            <div
              className="absolute right-0 top-[38px] z-30 min-w-[180px] py-2 rounded-xl"
              style={{
                background: 'rgba(255,250,243,.96)',
                border: '.5px solid rgba(255,255,255,.65)',
                boxShadow: '0 12px 40px rgba(80,50,30,.15)',
              }}
            >
              <div className="px-4 py-2 text-[11px] text-cocoa/35 border-b border-cocoa/6 font-mono">
                {user?.email}
              </div>
              <button
                disabled
                className="w-full text-left px-4 py-2 text-[12.5px] text-cocoa/20 cursor-default bg-transparent border-none font-sans"
              >
                Cambiar contrasena
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-[12.5px] text-rise hover:bg-accent/6 bg-transparent border-none cursor-pointer font-sans"
              >
                Salir
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Header.tsx
git commit -m "feat: Header con navegacion a secciones y dropdown de usuario"
```

---

### Task 8: DashboardPage — reorganizar e integrar

**Files:**
- Modify: `src/pages/DashboardPage.tsx`
- Modify: `src/pages/AdminVecinoPage.tsx`

- [ ] **Step 1: Actualizar DashboardPage**

```tsx
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { apiFetch } from '../api/client';
import { greeting } from '../lib/format';
import Header from '../components/Header';
import ConsumoCard from '../components/ConsumoCard';
import HistoricoCharts from '../components/HistoricoCharts';
import FacturasChart from '../components/FacturasChart';
import FacturasTable from '../components/FacturasTable';

interface Consumo {
  timestamp: string;
  kwh_calor: number;
  kwh_frio: number;
  m3_acs: number;
  kwh_acs: number;
  kwh_calor_mes_inicio: number | null;
  kwh_frio_mes_inicio: number | null;
  m3_acs_mes_inicio: number | null;
  temp_impulsion: number | null;
  temp_retorno: number | null;
  power_w: number | null;
}

interface Factura {
  id_factura: string;
  periodo: string;
  importe_total: number;
  kwh_calor: number;
  kwh_frio: number;
  kwh_acs: number;
  m3_acs: number;
  importe_calor: number;
  importe_frio: number;
  importe_acs: number;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [consumoActual, setConsumoActual] = useState<Consumo | null>(null);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);

  const { saludo } = greeting();
  const nombre = user?.vecino_piso || user?.email?.split('@')[0] || 'vecino';

  useEffect(() => {
    async function fetchData() {
      try {
        const [actual, facturasData] = await Promise.all([
          apiFetch<Consumo | null>('/consumo-actual'),
          apiFetch<Factura[]>('/facturas'),
        ]);
        setConsumoActual(actual);
        setFacturas(facturasData);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div>
        <Header showAdmin />
        <main className="max-w-[1180px] mx-auto px-6 flex items-center justify-center min-h-[60vh]">
          <div className="text-cocoa/40 text-sm">Cargando tus datos...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-in">
      <Header showAdmin />

      <main className="max-w-[1180px] mx-auto px-6 flex flex-col gap-[22px] pb-10">
        <div className="pt-2">
          <p className="eyebrow">Dashboard</p>
          <h1 className="font-display text-[40px] font-medium text-cocoa mt-1" style={{ letterSpacing: '-0.02em' }}>
            {saludo}, {nombre}.
          </h1>
        </div>

        <div className="stagger flex flex-col gap-[22px]">
          <ConsumoCard data={consumoActual} />
          <HistoricoCharts />
          <div id="facturas">
            <FacturasChart data={facturas} />
          </div>
          <FacturasTable data={facturas} />
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Actualizar AdminVecinoPage** — cambiar `ConsumoChart` → `HistoricoCharts`

```tsx
// En src/pages/AdminVecinoPage.tsx, cambiar la importacion y uso:
// import ConsumoChart from '../components/ConsumoChart';
// →
import HistoricoCharts from '../components/HistoricoCharts';

// Y en el JSX, cambiar:
// <ConsumoChart endpoint={`/admin/vecinos/${piso}`} title={`Historico — Piso ${piso}`} />
// →
<HistoricoCharts endpoint={`/admin/vecinos/${piso}`} title={`Historico — Piso ${piso}`} />
```

- [ ] **Step 3: Verificar build**

```bash
npm run build
```

Expected: No errors. `ConsumoChart` ya no se importa en ningún sitio.

- [ ] **Step 4: Eliminar ConsumoChart.tsx y su test**

```bash
rm src/components/ConsumoChart.tsx
rm src/components/ConsumoChart.test.tsx
```

- [ ] **Step 5: Ejecutar tests**

```bash
npm test -- --run
```

Expected: All tests pass. ConsumoChart.test.tsx ya no existe.

- [ ] **Step 6: Commit**

```bash
git add src/pages/DashboardPage.tsx src/pages/AdminVecinoPage.tsx
git rm src/components/ConsumoChart.tsx src/components/ConsumoChart.test.tsx
git commit -m "feat: integrar HistoricoCharts y FacturasChart en DashboardPage"
```

---

### Task 9: Actualizar tests e2e

**Files:**
- Modify: `e2e/specs/dashboard.spec.ts`
- Modify: `e2e/specs/date-range.spec.ts`

- [ ] **Step 1: Actualizar dashboard.spec.ts**

```tsx
// Reemplazar el test "shows date range picker in chart" — los presets ahora estan en HistoricoCharts (seccion "Historico"):
// test 2: sigue igual, los presets "24h", "7 dias", "1 ano" siguen existiendo

// Reemplazar el test "can switch between presets":
// "30 dias" y "24h" siguen existiendo, "No hay datos en este periodo" tambien

// Reemplazar el test "shows facturas table with rows":
// Facturas ahora tiene grafica + tabla. La grafica esta dentro del div #facturas
// El texto "Facturas" sigue existiendo

// El resto de tests no cambian.
```

Los tests actuales ya usan los textos correctos (`24h`, `7 dias`, `30 dias`, `1 ano`, `No hay datos en este periodo`, `Facturas`). Solo verificar que sigan pasando.

- [ ] **Step 2: Actualizar date-range.spec.ts**

Los presets y textos ya coinciden. Solo verificar que pasen.

- [ ] **Step 3: Commit**

```bash
git add e2e/specs/dashboard.spec.ts e2e/specs/date-range.spec.ts
git commit -m "test: verificar e2e tests con nuevos componentes"
```

---

### Task 10: Verificación final

- [ ] **Step 1: Frontend build + tests**

```bash
npm run build
npm test -- --run
```

Expected: Build OK, all tests pass.

- [ ] **Step 2: Backend typecheck + tests**

```bash
cd api && npx tsc --noEmit && npm test -- --run
```

Expected: No type errors, all tests pass.

- [ ] **Step 3: Rebuild docker y e2e**

```bash
docker compose -f docker-compose.e2e.yml build frontend
docker compose -f docker-compose.e2e.yml up -d frontend
docker compose -f docker-compose.e2e.yml --profile test run --rm playwright sh -c "npx playwright test"
```

Expected: 18 passed, 3 skipped, 0 failed.

---

### Task 11: Actualizar design.md

**Files:**
- Modify: `design.md`

- [ ] **Step 1: Actualizar sección Dashboard del vecino**

```markdown
### Dashboard del vecino
1. Greeting con saludo segun hora (`Buenos dias/tardes/noches`). Sin parrafo de soporte debajo.
2. ConsumoCard (live) con 4 columnas: Calor, Frio, ACS, Estado. Cada metrica con delta desde inicio de mes.
3. HistoricoCharts: una card con 3 graficas separadas (Calor, Frio, ACS). SegmentedControl + inputs fecha compartidos.
4. FacturasChart: barras apiladas con importes calor/frio/ACS por mes. Tooltip detallado.
5. FacturasTable.
```

- [ ] **Step 2: Commit**

```bash
git add design.md
git commit -m "docs: actualizar design.md con nuevo dashboard"
```
