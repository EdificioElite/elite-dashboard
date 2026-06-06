# Rediseño Dashboard Aerotermia Admin — Plan de Implementación

> **Para agentic workers:** REQUIRED SUB-SKILL: Usa superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan checkbox (`- [ ]`) para tracking.

**Goal:** Rediseñar `/admin/aerotermia` reorganizando cards, añadiendo card global en vivo, tabla pivote de facturas, y eliminando KPI + distribución por piso.

**Architecture:** Nuevo componente `GlobalEnVivoCard` + nuevo endpoint `GET /api/admin/aerotermia/en-vivo`. Reestructuración de `AdminAerotermiaPage` con nuevo orden de cards. Tabla pivote de facturas en frontend con `useMemo`.

**Tech Stack:** React + TypeScript, Express + PostgreSQL, Tailwind CSS, Vitest + React Testing Library, Supertest

**Spec:** `docs/superpowers/specs/2026-06-06-rediseno-aerotermia-admin-design.md`

---

### Task 1: Endpoint `GET /api/admin/aerotermia/en-vivo`

**Files:**
- Modify: `api/src/routes/adminAerotermia.ts`

- [ ] **Step 1: Añadir el endpoint**

Añadir antes del export default en `api/src/routes/adminAerotermia.ts`:

```typescript
const MODO_CALEFACCION_UMBRAL = 29;
const MODO_REFRIGERACION_UMBRAL = 21;

router.get('/admin/aerotermia/en-vivo', authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
  try {
    const sql = `
      WITH latest AS (
        SELECT DISTINCT ON (v.piso)
          v.piso,
          ct.created AS timestamp,
          ct.energy_wh_inst_value_0_0_0 / 1000.0 AS kwh_calor_abs,
          ct.energy_manufacturer_specific_02_wh_inst_value_0_0_0 / 1000.0 AS kwh_frio_abs,
          ct.volume_m3_inst_value_0_1_0 AS m3_acs_abs,
          ct.flow_temp_c_inst_value_0_0_0 AS temp_impulsion,
          ct.return_temp_c_inst_value_0_0_0 AS temp_retorno,
          ct.power_w_inst_value_0_0_0 AS power_w
        FROM contadores ct
        JOIN vecinos v ON ct.device_identification = v.device_identification
          AND ct.serial_number::text = v.serial_number
        ORDER BY v.piso, ct.created DESC
      ),
      first_of_month AS (
        SELECT DISTINCT ON (v.piso)
          v.piso,
          ct.energy_wh_inst_value_0_0_0 / 1000.0 AS kwh_calor_start,
          ct.energy_manufacturer_specific_02_wh_inst_value_0_0_0 / 1000.0 AS kwh_frio_start,
          ct.volume_m3_inst_value_0_1_0 AS m3_acs_start
        FROM contadores ct
        JOIN vecinos v ON ct.device_identification = v.device_identification
          AND ct.serial_number::text = v.serial_number
        WHERE ct.created >= date_trunc('month', NOW())
        ORDER BY v.piso, ct.created ASC
      )
      SELECT
        MAX(l.timestamp) AS timestamp,
        ROUND(SUM(l.kwh_calor_abs)::numeric, 1) AS kwh_calor_abs,
        ROUND(SUM(l.kwh_frio_abs)::numeric, 1) AS kwh_frio_abs,
        ROUND(SUM(l.m3_acs_abs)::numeric, 3) AS m3_acs_abs,
        ROUND(SUM(l.kwh_calor_abs - COALESCE(f.kwh_calor_start, l.kwh_calor_abs))::numeric, 1) AS kwh_calor_mes_inicio,
        ROUND(SUM(l.kwh_frio_abs - COALESCE(f.kwh_frio_start, l.kwh_frio_abs))::numeric, 1) AS kwh_frio_mes_inicio,
        ROUND(SUM(l.m3_acs_abs - COALESCE(f.m3_acs_start, l.m3_acs_abs))::numeric, 3) AS m3_acs_mes_inicio,
        ROUND(AVG(l.temp_impulsion)::numeric, 2) AS temp_impulsion_avg,
        ROUND(MAX(l.temp_impulsion)::numeric, 2) AS temp_impulsion_max,
        ROUND(MIN(l.temp_impulsion)::numeric, 2) AS temp_impulsion_min,
        ROUND(AVG(l.temp_retorno)::numeric, 2) AS temp_retorno_avg,
        ROUND(MAX(l.temp_retorno)::numeric, 2) AS temp_retorno_max,
        ROUND(MIN(l.temp_retorno)::numeric, 2) AS temp_retorno_min,
        ROUND(SUM(l.power_w)::numeric, 1) AS power_w_total
      FROM latest l
      LEFT JOIN first_of_month f ON l.piso = f.piso
    `;

    const result = await query(sql);

    if (result.rows.length === 0 || result.rows[0].kwh_calor_abs === null) {
      res.json(null);
      return;
    }

    const row = result.rows[0];
    const t = row.temp_impulsion_avg as number | null;

    let modo: 'calefaccion' | 'refrigeracion' | 'desconocido' = 'desconocido';
    if (t != null) {
      if (t > MODO_CALEFACCION_UMBRAL) modo = 'calefaccion';
      else if (t < MODO_REFRIGERACION_UMBRAL) modo = 'refrigeracion';
    }

    res.json({ ...row, modo });
  } catch (err) {
    logger.error(err, 'Admin aerotermia en-vivo error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
```

Colocar después de la línea 96 (`export default router;`) en `api/src/routes/adminAerotermia.ts`, es decir, justo antes del `export default router`.

Las constantes `MODO_CALEFACCION_UMBRAL` y `MODO_REFRIGERACION_UMBRAL` deben ir al principio del archivo, después de los imports (línea 7).

**Nota:** El endpoint existente de `/consumo-actual` en `api/src/routes/consumos.ts` ya define estas mismas constantes (líneas 8-9). Las duplicamos en `adminAerotermia.ts` para mantener cada archivo autónomo.

- [ ] **Step 2: Escribir test de integración para el endpoint**

Crear/modificar `api/src/__tests__/adminAerotermia.test.ts`. Añadir este bloque de tests:

```typescript
describe('GET /api/admin/aerotermia/en-vivo', () => {
  it('devuelve null cuando no hay contadores', async () => {
    const res = await request(app)
      .get('/api/admin/aerotermia/en-vivo')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  it('devuelve datos agregados cuando hay contadores', async () => {
    await db.query(`
      INSERT INTO vecinos (piso, serial_number, device_identification) VALUES
        ('1A', '111', 'dev-1a'),
        ('1B', '222', 'dev-1b');
    `);
    const now = new Date().toISOString();
    await db.query(`
      INSERT INTO contadores (serial_number, device_identification, created,
        energy_wh_inst_value_0_0_0,
        energy_manufacturer_specific_02_wh_inst_value_0_0_0,
        volume_m3_inst_value_0_1_0,
        flow_temp_c_inst_value_0_0_0,
        return_temp_c_inst_value_0_0_0,
        power_w_inst_value_0_0_0)
      VALUES
        (111, 'dev-1a', $1, 100000, 50000, 10.5, 42.0, 32.0, 200),
        (222, 'dev-1b', $1, 80000, 40000, 8.2, 38.0, 28.0, 100);
    `, [now]);

    const res = await request(app)
      .get('/api/admin/aerotermia/en-vivo')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body.kwh_calor_abs).toBe(180);
    expect(res.body.kwh_frio_abs).toBe(90);
    expect(res.body.m3_acs_abs).toBe(18.7);
    expect(res.body.modo).toBe('calefaccion');
    expect(res.body.temp_impulsion_avg).toBe(40);
  });

  it('requiere autenticacion admin', async () => {
    const res = await request(app)
      .get('/api/admin/aerotermia/en-vivo')
      .set('Authorization', `Bearer ${vecinoToken}`);
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 3: Ejecutar tests del backend**

```bash
cd api && npm test
```

Esperado: todos los tests pasan, incluidos los nuevos.

- [ ] **Step 4: Verificar que compila TypeScript**

```bash
cd api && npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Step 5: Commit**

```bash
git add api/src/routes/adminAerotermia.ts api/src/__tests__/adminAerotermia.test.ts
git commit -m "feat: añadir endpoint /admin/aerotermia/en-vivo con datos agregados en vivo"
```

---

### Task 2: Componente `GlobalEnVivoCard`

**Files:**
- Create: `src/components/GlobalEnVivoCard.tsx`
- Create: `src/components/GlobalEnVivoCard.test.tsx`

- [ ] **Step 1: Escribir el test del componente**

Crear `src/components/GlobalEnVivoCard.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import GlobalEnVivoCard from './GlobalEnVivoCard';

const mockApiFetch = vi.fn();
vi.mock('../api/client', () => ({ apiFetch: (...args: unknown[]) => mockApiFetch(...args) }));

describe('GlobalEnVivoCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('muestra "Esperando datos" cuando no hay datos', async () => {
    mockApiFetch.mockResolvedValue(null);
    render(<GlobalEnVivoCard />);
    await waitFor(() => {
      expect(screen.getByText(/Esperando datos/)).toBeInTheDocument();
    });
  });

  it('muestra los 5 bloques cuando hay datos', async () => {
    mockApiFetch.mockResolvedValue({
      timestamp: '2026-06-06T14:05:22Z',
      kwh_calor_abs: 12450.6,
      kwh_frio_abs: 6180.2,
      m3_acs_abs: 245.6,
      kwh_calor_mes_inicio: 342.1,
      kwh_frio_mes_inicio: 89.3,
      m3_acs_mes_inicio: 12.3,
      temp_impulsion_avg: 42.0,
      temp_impulsion_max: 48.2,
      temp_impulsion_min: 35.1,
      temp_retorno_avg: 33.5,
      temp_retorno_max: 38.6,
      temp_retorno_min: 28.3,
      modo: 'calefaccion',
      power_w_total: 2850,
    });
    render(<GlobalEnVivoCard />);
    await waitFor(() => {
      expect(screen.getByText('Aerotermia Global en Vivo')).toBeInTheDocument();
    });
    expect(screen.getByText('12.450,6')).toBeInTheDocument();
    expect(screen.getByText('6.180,2')).toBeInTheDocument();
    expect(screen.getByText('245,6')).toBeInTheDocument();
    expect(screen.getByText('Calefacción')).toBeInTheDocument();
    expect(screen.getByText('48,2° máx')).toBeInTheDocument();
  });

  it('muestra modo refrigeracion', async () => {
    mockApiFetch.mockResolvedValue({
      timestamp: '2026-06-06T14:05:22Z',
      kwh_calor_abs: 100, kwh_frio_abs: 100, m3_acs_abs: 10,
      kwh_calor_mes_inicio: 0, kwh_frio_mes_inicio: 0, m3_acs_mes_inicio: 0,
      temp_impulsion_avg: 15.0, temp_impulsion_max: 18, temp_impulsion_min: 12,
      temp_retorno_avg: 10, temp_retorno_max: 12, temp_retorno_min: 8,
      modo: 'refrigeracion', power_w_total: 500,
    });
    render(<GlobalEnVivoCard />);
    await waitFor(() => {
      expect(screen.getByText('Refrigeración')).toBeInTheDocument();
    });
  });

  it('hace polling cada 30s', async () => {
    mockApiFetch.mockResolvedValue(null);
    render(<GlobalEnVivoCard />);
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(1);
    });
    act(() => { vi.advanceTimersByTime(30000); });
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(2);
    });
    act(() => { vi.advanceTimersByTime(30000); });
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(3);
    });
  });
});
```

- [ ] **Step 2: Ejecutar test para verificar que falla**

```bash
npx vitest run src/components/GlobalEnVivoCard.test.tsx
```

Esperado: FAIL (componente no existe aún).

- [ ] **Step 3: Implementar el componente**

Crear `src/components/GlobalEnVivoCard.tsx`:

```typescript
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
```

- [ ] **Step 4: Ejecutar tests**

```bash
npx vitest run src/components/GlobalEnVivoCard.test.tsx
```

Esperado: todos los tests pasan.

- [ ] **Step 5: Commit**

```bash
git add src/components/GlobalEnVivoCard.tsx src/components/GlobalEnVivoCard.test.tsx
git commit -m "feat: añadir componente GlobalEnVivoCard con polling 30s"
```

---

### Task 3: Reestructurar `AdminAerotermiaPage`

**Files:**
- Modify: `src/pages/AdminAerotermiaPage.tsx`

- [ ] **Step 1: Reescribir AdminAerotermiaPage**

Reemplazar el contenido completo de `src/pages/AdminAerotermiaPage.tsx` con:

```typescript
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import Icon from '../components/Icon';
import HistoricoCharts from '../components/HistoricoCharts';
import CopChart from '../components/CopChart';
import FacturaElectricaTable from '../components/FacturaElectricaTable';
import HeatmapChart from '../components/HeatmapChart';
import { toDatetimeLocal, fromDatetimeLocal, applyPreset, Preset } from '../lib/dates';
import DateRangeControls from '../components/DateRangeControls';
import GlobalEnVivoCard from '../components/GlobalEnVivoCard';

interface ConsumoAgregado {
  timestamp: string;
  kwh_calor: number;
  kwh_frio: number;
  m3_acs: number;
  kwh_acs: number;
}

interface FacturaGlobal {
  id_factura: string;
  piso: string;
  periodo: string;
  importe_total: number;
  importe_fijo: number;
  kwh_calor: number;
  kwh_frio: number;
  kwh_acs: number;
  m3_acs: number;
  importe_calor: number;
  importe_frio: number;
  importe_variable_acs: number;
  importe_acs: number;
  fecha_factura_inicio?: string;
  fecha_factura_fin?: string;
}

interface CopDatum {
  id: string;
  startdate: string;
  enddate: string;
  amount: number | null;
  kwh_electricos: number | null;
  kwh_termicos: number | null;
  cop: number | null;
}

function formatPeriodo(periodo: string): string {
  const d = new Date(periodo);
  return d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
}

export default function AdminAerotermiaPage() {
  const [consumos, setConsumos] = useState<ConsumoAgregado[]>([]);
  const [facturas, setFacturas] = useState<FacturaGlobal[]>([]);
  const [copData, setCopData] = useState<CopDatum[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<Preset | null>('3m');
  const [desdeInput, setDesdeInput] = useState(() => toDatetimeLocal(applyPreset('3m').desde));
  const [hastaInput, setHastaInput] = useState(() => toDatetimeLocal(applyPreset('3m').hasta));

  const [sections, setSections] = useState<Record<string, boolean>>({
    historico: true,
    facturas: true,
    cop: true,
    heatmap: false,
  });

  const [searchVecino, setSearchVecino] = useState('');

  const toggleSection = (key: string) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const desde = desdeInput ? fromDatetimeLocal(desdeInput) : '';
  const hasta = hastaInput ? fromDatetimeLocal(hastaInput) : '';

  useEffect(() => {
    apiFetch<FacturaGlobal[]>('/admin/aerotermia/facturas')
      .then(setFacturas)
      .catch(() => setFacturas([]));
    apiFetch<CopDatum[]>('/admin/aerotermia/cop')
      .then(setCopData)
      .catch(() => setCopData([]));
  }, []);

  useEffect(() => {
    if (!desde || !hasta) return;
    const qs = `?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`;
    apiFetch<ConsumoAgregado[]>(`/admin/aerotermia/consumos${qs}`)
      .then(setConsumos)
      .catch(() => setConsumos([]))
      .finally(() => setLoading(false));
  }, [desde, hasta]);

  const filteredFacturas = useMemo(() => {
    if (!desde || !hasta) return facturas;
    const desdeD = new Date(desde).getTime();
    const hastaD = new Date(hasta).getTime();
    return facturas.filter((f) => {
      const t = new Date(f.periodo).getTime();
      return t >= desdeD && t <= hastaD;
    });
  }, [facturas, desde, hasta]);

  const pisosUnicos = useMemo(() => {
    return [...new Set(facturas.map((f) => f.piso))].sort();
  }, [facturas]);

  const pisosFiltrados = useMemo(() => {
    if (!searchVecino.trim()) return pisosUnicos;
    const q = searchVecino.toLowerCase();
    return pisosUnicos.filter((p) => p.toLowerCase().includes(q));
  }, [pisosUnicos, searchVecino]);

  // Tabla pivote de facturas
  const periodosUnicos = useMemo(() => {
    const set = new Set<string>();
    filteredFacturas.forEach((f) => set.add(f.periodo));
    return [...set].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [filteredFacturas]);

  const facturasPivote = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    filteredFacturas.forEach((f) => {
      if (!map.has(f.piso)) map.set(f.piso, {});
      map.get(f.piso)![f.periodo] = Number(f.importe_total);
    });
    return map;
  }, [filteredFacturas]);

  const heatmapData = useMemo(() => {
    return filteredFacturas.map((f) => {
      const d = new Date(f.periodo);
      const periodo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return {
        piso: f.piso,
        periodo,
        kwh_calor: Number(f.kwh_calor),
        kwh_frio: Number(f.kwh_frio),
        kwh_acs: Number(f.kwh_acs),
        m3_acs: Number(f.m3_acs),
      };
    });
  }, [filteredFacturas]);

  const filteredCopData = useMemo(() => {
    if (!desde || !hasta) return copData;
    const desdeD = new Date(desde).getTime();
    const hastaD = new Date(hasta).getTime();
    return copData.filter((c) => {
      const t = new Date(c.startdate).getTime();
      return t >= desdeD && t <= hastaD;
    });
  }, [copData, desde, hasta]);

  const SectionHeader = ({ id, label, icon }: { id: string; label: string; icon: string }) => (
    <button
      onClick={() => toggleSection(id)}
      className="flex items-center gap-3 w-full text-left py-3"
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-2)' }}>
        <Icon name={icon} size={14} className="text-cream" />
      </div>
      <span className="eyebrow flex-1">{label}</span>
      <Icon name={sections[id] ? 'chevronUp' : 'chevronDown'} size={16} className="text-cocoa/30" />
    </button>
  );

  if (loading) {
    return (
      <div>
        <main className="max-w-[1180px] mx-auto px-6 flex items-center justify-center min-h-[60vh]">
          <div className="text-cocoa/40 text-sm">Cargando datos del edificio...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-in">
      <main className="max-w-[1180px] mx-auto px-6 flex flex-col gap-[22px] pb-10">
        <div className="pt-2">
          <div className="flex items-center gap-2 text-sm mb-3">
            <Link to="/admin/vecinos" className="text-accent hover:text-accent-dark">Admin</Link>
            <span className="text-cocoa/30">→</span>
            <span className="text-cocoa/60">Aerotermia</span>
          </div>
          <p className="eyebrow">Panel de administración</p>
          <h1
            className="font-display text-[40px] font-medium text-cocoa mt-1"
            style={{ letterSpacing: '-0.02em' }}
          >
            Aerotermia Admin
          </h1>
          <p className="text-sm text-cocoa/60 mt-1.5 max-w-lg">
            Dashboard general de consumos y facturas del edificio.
          </p>
        </div>

        <div className="flex flex-col gap-[22px]">
          {/* 1. Global en Vivo */}
          <GlobalEnVivoCard />

          {/* 2. Dashboards de vecinos */}
          <div className="glass p-[26px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
                <Icon name="users" size={14} className="text-cream" />
              </div>
              <span className="eyebrow">Dashboards de vecinos</span>
            </div>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Buscar piso..."
                value={searchVecino}
                onChange={(e) => setSearchVecino(e.target.value)}
                className="input-card text-xs py-2 px-3 w-full max-w-[220px]"
              />
            </div>
            {pisosFiltrados.length === 0 ? (
              <p className="text-sm text-cocoa/40">Sin resultados</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {pisosFiltrados.map((p) => (
                  <Link
                    key={p}
                    to={`/aerotermia?piso=${p}`}
                    className="text-center py-2 px-1 rounded-lg border border-cocoa/6 bg-cream/30 hover:bg-accent/5 hover:border-accent/25 hover:-translate-y-px hover:shadow-sm transition-all duration-200"
                  >
                    <span className="text-sm font-semibold text-cocoa">{p}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 3. DateRangeControls */}
          <DateRangeControls
            preset={preset}
            desdeInput={desdeInput}
            hastaInput={hastaInput}
            onPresetChange={(p) => {
              setPreset(p);
              const { desde, hasta } = applyPreset(p as Preset);
              setDesdeInput(toDatetimeLocal(desde));
              setHastaInput(toDatetimeLocal(hasta));
            }}
            onCustomApply={(d, h) => {
              setDesdeInput(d);
              setHastaInput(h);
              setPreset(null);
            }}
          />

          <div className="stagger flex flex-col gap-[22px]">
            {/* 4. Histórico global */}
            <div className="glass p-[26px]">
              <SectionHeader id="historico" label="Histórico global" icon="activity" />
              {sections.historico && (
                <div className="mt-3">
                  <HistoricoCharts endpoint="/admin/aerotermia/consumos" title="Histórico — Global" desde={desde} hasta={hasta} />
                </div>
              )}
            </div>

            {/* 5. Facturas — Tabla pivote */}
            <div className="glass p-[26px]">
              <SectionHeader id="facturas" label="Facturas" icon="dollar" />
              {sections.facturas && (
                <div className="mt-3 overflow-x-auto">
                  {periodosUnicos.length === 0 ? (
                    <p className="text-sm text-cocoa/40 py-8">No hay facturas en este periodo</p>
                  ) : (
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr>
                          <th className="text-left py-2 px-3 font-medium uppercase tracking-wider text-cocoa/40 sticky left-0 bg-[rgba(255,251,245,0.95)] z-10" style={{ minWidth: '60px' }}>Piso</th>
                          {periodosUnicos.map((p) => (
                            <th key={p} className="text-right py-2 px-3 font-medium uppercase tracking-wider text-cocoa/40" style={{ minWidth: '70px' }}>
                              {formatPeriodo(p)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pisosUnicos.map((piso) => (
                          <tr key={piso} className="border-t border-cocoa/5">
                            <td className="py-2 px-3 font-semibold text-cocoa sticky left-0 bg-[rgba(255,251,245,0.95)]">{piso}</td>
                            {periodosUnicos.map((periodo) => {
                              const importe = facturasPivote.get(piso)?.[periodo];
                              return (
                                <td key={periodo} className="py-2 px-3 text-right font-mono tabular-nums text-cocoa/70">
                                  {importe != null ? `${importe.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : '—'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>

            {/* 6. COP y factura electrica */}
            <div className="glass p-[26px]">
              <SectionHeader id="cop" label="COP y factura electrica" icon="zap" />
              {sections.cop && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px] mt-3">
                  <CopChart data={filteredCopData} />
                  <FacturaElectricaTable data={filteredCopData} />
                </div>
              )}
            </div>

            {/* 7. Heatmap */}
            <div className="glass p-[26px]">
              <SectionHeader id="heatmap" label="Heatmap de consumo" icon="flame" />
              {sections.heatmap && (
                <div className="mt-3">
                  <HeatmapChart data={heatmapData} />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Actualizar tests existentes de AdminAerotermiaPage**

Modificar `src/__tests__/AdminAerotermiaPage.test.tsx`. Buscar y eliminar aserciones relacionadas con:
- KPI (Total kWh calor, Total kWh frio, Total m³ ACS, Total facturado)
- PieChartCard / Distribución por piso
- ConsumoVecinosChart
- FacturasChart (si hay aserciones sobre el gráfico de barras)

Añadir aserciones para los nuevos elementos:
- `GlobalEnVivoCard` renderiza
- El input de buscar vecinos existe
- La tabla pivote de facturas se renderiza con columnas

Ejemplo de test actualizado:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminAerotermiaPage from '../pages/AdminAerotermiaPage';

vi.mock('../api/client', () => ({
  apiFetch: vi.fn((url: string) => {
    if (url === '/admin/aerotermia/facturas') return Promise.resolve([]);
    if (url === '/admin/aerotermia/cop') return Promise.resolve([]);
    if (url.includes('/admin/aerotermia/consumos')) return Promise.resolve([]);
    if (url === '/admin/aerotermia/en-vivo') return Promise.resolve(null);
    return Promise.resolve([]);
  }),
}));

describe('AdminAerotermiaPage', () => {
  it('renderiza la card Global en Vivo', async () => {
    render(<MemoryRouter><AdminAerotermiaPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Aerotermia Global en Vivo')).toBeInTheDocument();
    });
  });

  it('renderiza el buscador de vecinos', async () => {
    render(<MemoryRouter><AdminAerotermiaPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Buscar piso...')).toBeInTheDocument();
    });
  });

  it('renderiza las secciones principales', async () => {
    render(<MemoryRouter><AdminAerotermiaPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Histórico global')).toBeInTheDocument();
      expect(screen.getByText('Facturas')).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 3: Ejecutar todos los tests**

```bash
npm test
```

Esperado: todos los tests pasan.

- [ ] **Step 4: Verificar build**

```bash
npm run build
```

Esperado: build exitoso.

- [ ] **Step 5: Verificar TypeScript backend**

```bash
cd api && npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/pages/AdminAerotermiaPage.tsx src/__tests__/AdminAerotermiaPage.test.tsx
git commit -m "feat: reestructurar dashboard aerotermia admin con nueva card global y tabla pivote"
```

---

### Task 4: Limpiar imports no usados y verificación final

**Files:**
- Modify: `src/pages/AdminAerotermiaPage.tsx` (ya reescrito en Task 3)

- [ ] **Step 1: Verificar que no hay imports no usados**

```bash
npx tsc --noEmit
```

Si hay warnings de imports no usados, eliminarlos del archivo.

- [ ] **Step 2: Ejecutar todos los tests (frontend + backend)**

```bash
npm test && cd api && npm test
```

Esperado: todos pasan.

- [ ] **Step 3: Ejecutar build final**

```bash
npm run build && cd api && npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "chore: limpiar imports y verificar build completo"
```
