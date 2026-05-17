# Admin Aerotermia Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Proximamente" placeholder in AdminAerotermiaPage with a full admin dashboard showing building-wide aerotermia data (stats, pie chart, bar charts, invoice selector, historical charts, and monthly heatmap).

**Architecture:** New backend route file `adminAerotermia.ts` with 3 aggregated endpoints + 1 missing vecino-facturas endpoint in `admin.ts`. Four new frontend components (PieChartCard, ConsumoVecinosChart, FacturaSelector, HeatmapChart) composed in the updated `AdminAerotermiaPage`. All charts use Recharts, all cards use the glass pattern.

**Tech Stack:** TypeScript strict, Express, Recharts v2, React Router v6, Tailwind CSS, vitest + @testing-library/react + supertest

---

### Task 1: Backend - Create admin aerotermia routes

**Files:**
- Create: `api/src/routes/adminAerotermia.ts`

- [ ] **Step 1: Write the backend tests first**

Create `api/src/__tests__/adminAerotermia.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import adminAerotermiaRoutes from '../routes/adminAerotermia';
import { signToken } from '../lib/jwt';

process.env.JWT_SECRET = 'test-secret-key';

vi.mock('../db', () => ({
  query: vi.fn(),
  pool: {},
}));

vi.mock('../middleware/rateLimit', () => ({
  rateLimit: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}));

import { query } from '../db';
const mockQuery = query as ReturnType<typeof vi.fn>;

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', adminAerotermiaRoutes);
  return app;
}

function adminToken() {
  return signToken({ userId: 1, vecinoPiso: '1A', email: 'admin@test.com', isAdmin: true });
}

function userToken() {
  return signToken({ userId: 2, vecinoPiso: '2A', email: 'user@test.com', isAdmin: false });
}

describe('Admin Aerotermia routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/admin/aerotermia/consumos', () => {
    it('rejects non-admin users with 403', async () => {
      const app = createApp();
      const res = await request(app)
        .get('/api/admin/aerotermia/consumos?desde=2026-01-01T00:00:00&hasta=2026-01-02T00:00:00')
        .set('Authorization', `Bearer ${userToken()}`);
      expect(res.status).toBe(403);
    });

    it('returns 400 when desde or hasta missing', async () => {
      const app = createApp();
      const res = await request(app)
        .get('/api/admin/aerotermia/consumos')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(400);
    });

    it('returns empty array when no data', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const res = await request(app)
        .get('/api/admin/aerotermia/consumos?desde=2026-01-01T00:00:00&hasta=2026-01-02T00:00:00')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns aggregated consumption data', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { timestamp: '2026-01-01T01:00:00.000Z', kwh_calor: 10.5, kwh_frio: 2.3, m3_acs: 0.15, kwh_acs: 6.975 },
          { timestamp: '2026-01-01T02:00:00.000Z', kwh_calor: 8.2, kwh_frio: 1.5, m3_acs: 0.12, kwh_acs: 5.58 },
        ],
      });
      const app = createApp();
      const res = await request(app)
        .get('/api/admin/aerotermia/consumos?desde=2026-01-01T00:00:00&hasta=2026-01-02T00:00:00')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].kwh_calor).toBe(10.5);
      expect(res.body[0].kwh_acs).toBe(6.975);
    });
  });

  describe('GET /api/admin/aerotermia/facturas', () => {
    it('rejects non-admin users with 403', async () => {
      const app = createApp();
      const res = await request(app)
        .get('/api/admin/aerotermia/facturas')
        .set('Authorization', `Bearer ${userToken()}`);
      expect(res.status).toBe(403);
    });

    it('returns empty array when no facturas', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const res = await request(app)
        .get('/api/admin/aerotermia/facturas')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns all facturas ordered by period desc', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id_factura: 'FAC-001', piso: '1A', periodo: '2026-03-01', importe_total: 80, kwh_calor: 100, kwh_frio: 20, kwh_acs: 30, m3_acs: 1.5, importe_calor: 40, importe_frio: 8, importe_acs: 32, fecha_factura_inicio: '2026-02-01', fecha_factura_fin: '2026-02-28' },
          { id_factura: 'FAC-001', piso: '2A', periodo: '2026-03-01', importe_total: 60, kwh_calor: 80, kwh_frio: 15, kwh_acs: 25, m3_acs: 1.2, importe_calor: 32, importe_frio: 6, importe_acs: 22, fecha_factura_inicio: '2026-02-01', fecha_factura_fin: '2026-02-28' },
          { id_factura: 'FAC-002', piso: '1A', periodo: '2026-04-01', importe_total: 90, kwh_calor: 110, kwh_frio: 25, kwh_acs: 35, m3_acs: 1.8, importe_calor: 44, importe_frio: 10, importe_acs: 36, fecha_factura_inicio: '2026-03-01', fecha_factura_fin: '2026-03-31' },
        ],
      });
      const app = createApp();
      const res = await request(app)
        .get('/api/admin/aerotermia/facturas')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
    });
  });

  describe('GET /api/admin/aerotermia/facturas/:id_factura', () => {
    it('rejects non-admin users with 403', async () => {
      const app = createApp();
      const res = await request(app)
        .get('/api/admin/aerotermia/facturas/FAC-001')
        .set('Authorization', `Bearer ${userToken()}`);
      expect(res.status).toBe(403);
    });

    it('returns factura detail per vecino', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { piso: '1A', kwh_calor: 100, kwh_frio: 20, kwh_acs: 30, m3_acs: 1.5, importe_total: 80, importe_calor: 40, importe_frio: 8, importe_acs: 32, periodo: '2026-03-01' },
          { piso: '2A', kwh_calor: 80, kwh_frio: 15, kwh_acs: 25, m3_acs: 1.2, importe_total: 60, importe_calor: 32, importe_frio: 6, importe_acs: 22, periodo: '2026-03-01' },
        ],
      });
      const app = createApp();
      const res = await request(app)
        .get('/api/admin/aerotermia/facturas/FAC-001')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].piso).toBe('1A');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd api && npx vitest run src/__tests__/adminAerotermia.test.ts`
Expected: All tests FAIL ("Cannot find module '../routes/adminAerotermia'")

- [ ] **Step 3: Create the admin aerotermia routes file**

Create `api/src/routes/adminAerotermia.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { logger } from '../lib/logger';

const router = Router();

router.get('/admin/aerotermia/consumos', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { desde, hasta } = req.query;

    if (!desde || !hasta) {
      res.status(400).json({ error: 'Parametros desde y hasta requeridos' });
      return;
    }

    const MAX_POINTS = 500;

    const sql = `
      WITH all_readings AS (
        SELECT
          v.piso,
          ct.datetime_inst_value_0_0_0 AS timestamp,
          ct.energy_wh_inst_value_0_0_0,
          ct.energy_manufacturer_specific_02_wh_inst_value_0_0_0,
          ct.volume_m3_inst_value_0_1_0
        FROM contadores ct
        JOIN vecinos v ON ct.device_identification = v.device_identification
          AND ct.serial_number::text = v.serial_number
        WHERE ct.datetime_inst_value_0_0_0 >= $1
          AND ct.datetime_inst_value_0_0_0 <= $2
      ),
      vecino_deltas AS (
        SELECT
          piso,
          timestamp,
          (energy_wh_inst_value_0_0_0 - LAG(energy_wh_inst_value_0_0_0) OVER (PARTITION BY piso ORDER BY timestamp)) / 1000.0 AS kwh_calor_raw,
          (energy_manufacturer_specific_02_wh_inst_value_0_0_0 - LAG(energy_manufacturer_specific_02_wh_inst_value_0_0_0) OVER (PARTITION BY piso ORDER BY timestamp)) / 1000.0 AS kwh_frio_raw,
          (volume_m3_inst_value_0_1_0 - LAG(volume_m3_inst_value_0_1_0) OVER (PARTITION BY piso ORDER BY timestamp)) AS m3_acs_raw
        FROM all_readings
      ),
      valid_deltas AS (
        SELECT
          date_trunc('hour', timestamp) AS hour,
          ROUND(SUM(kwh_calor_raw)::numeric, 3) AS kwh_calor,
          ROUND(SUM(kwh_frio_raw)::numeric, 3) AS kwh_frio,
          ROUND(SUM(m3_acs_raw)::numeric, 3) AS m3_acs,
          ROUND((SUM(m3_acs_raw) * 46.5)::numeric, 3) AS kwh_acs
        FROM vecino_deltas
        WHERE kwh_calor_raw IS NOT NULL
        GROUP BY date_trunc('hour', timestamp)
        ORDER BY hour
      ),
      counted AS (
        SELECT *, ROW_NUMBER() OVER (ORDER BY hour) AS rn, COUNT(*) OVER () AS total
        FROM valid_deltas
      )
      SELECT hour AS timestamp, kwh_calor, kwh_frio, m3_acs, kwh_acs
      FROM counted
      WHERE total <= ${MAX_POINTS}
         OR rn = 1
         OR rn = total
         OR rn % GREATEST(1, CEIL(total / ${MAX_POINTS}.0)::int) = 1
      ORDER BY hour ASC
    `;

    const result = await query(sql, [desde, hasta]);
    res.json(result.rows);
  } catch (err) {
    logger.error(err, 'Admin aerotermia consumos error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/admin/aerotermia/facturas', authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT
        f.id_factura,
        f.piso,
        f.fecha_factura_creacion AS periodo,
        f.importe_vivienda_total AS importe_total,
        f.kwh_vivienda_calor AS kwh_calor,
        f.kwh_vivienda_frio AS kwh_frio,
        f.kwh_vivienda_acs AS kwh_acs,
        f.m3_vivienda_acs AS m3_acs,
        f.importe_vivienda_variable_calor AS importe_calor,
        f.importe_vivienda_variable_frio AS importe_frio,
        f.importe_vivienda_acs AS importe_acs,
        f.fecha_factura_inicio,
        f.fecha_factura_fin
      FROM facturas f
      ORDER BY f.fecha_factura_creacion DESC, f.piso ASC
    `);
    res.json(result.rows);
  } catch (err) {
    logger.error(err, 'Admin aerotermia facturas error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/admin/aerotermia/facturas/:id_factura', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { id_factura } = req.params;

    const result = await query(`
      SELECT
        f.piso,
        f.fecha_factura_creacion AS periodo,
        f.kwh_vivienda_calor AS kwh_calor,
        f.kwh_vivienda_frio AS kwh_frio,
        f.kwh_vivienda_acs AS kwh_acs,
        f.m3_vivienda_acs AS m3_acs,
        f.importe_vivienda_total AS importe_total,
        f.importe_vivienda_variable_calor AS importe_calor,
        f.importe_vivienda_variable_frio AS importe_frio,
        f.importe_vivienda_acs AS importe_acs,
        f.fecha_factura_inicio,
        f.fecha_factura_fin
      FROM facturas f
      WHERE f.id_factura = $1
      ORDER BY f.piso ASC
    `, [id_factura]);

    res.json(result.rows);
  } catch (err) {
    logger.error(err, 'Admin aerotermia factura detalle error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd api && npx vitest run src/__tests__/adminAerotermia.test.ts`
Expected: ALL tests PASS

- [ ] **Step 5: Commit**

```bash
git add api/src/routes/adminAerotermia.ts api/src/__tests__/adminAerotermia.test.ts
git commit -m "feat: endpoints admin aerotermia (consumos agregados, facturas globales, detalle factura)"
```

---

### Task 2: Backend - Register admin aerotermia routes + add missing vecino facturas endpoint

**Files:**
- Modify: `api/src/index.ts`
- Modify: `api/src/routes/admin.ts`

- [ ] **Step 1: Add the missing vecino-facturas endpoint to admin.ts**

Add before `export default router;` in `api/src/routes/admin.ts`:

```typescript
router.get('/admin/vecinos/:piso/facturas', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { piso } = req.params;

    const result = await query(
      `SELECT
        f.id_factura,
        f.fecha_factura_creacion AS periodo,
        f.importe_vivienda_total AS importe_total,
        f.kwh_vivienda_calor AS kwh_calor,
        f.kwh_vivienda_frio AS kwh_frio,
        f.kwh_vivienda_acs AS kwh_acs,
        f.m3_vivienda_acs AS m3_acs,
        f.importe_vivienda_variable_calor AS importe_calor,
        f.importe_vivienda_variable_frio AS importe_frio,
        f.importe_vivienda_acs AS importe_acs,
        f.fecha_factura_inicio,
        f.fecha_factura_fin
      FROM facturas f
      WHERE f.piso = $1
      ORDER BY f.fecha_factura_creacion DESC`,
      [piso]
    );

    res.json(result.rows);
  } catch (err) {
    logger.error(err, 'Admin vecino facturas error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
```

- [ ] **Step 2: Register admin aerotermia routes in index.ts**

In `api/src/index.ts`, add after `import adminRoutes from './routes/admin';`:

```typescript
import adminAerotermiaRoutes from './routes/adminAerotermia';
```

And after `app.use('/api', adminRoutes);`:

```typescript
app.use('/api', adminAerotermiaRoutes);
```

Also update the `normalizePath` array to include the new routes:

```typescript
normalizePath: [
  [/^\/api\/admin\/vecinos\/[^/]+$/, '/api/admin/vecinos/:piso'],
  [/^\/api\/admin\/vecinos\/[^/]+\/facturas$/, '/api/admin/vecinos/:piso/facturas'],
  [/^\/api\/admin\/usuarios\/\d+$/, '/api/admin/usuarios/:id'],
  [/^\/api\/admin\/usuarios\/\d+\/password$/, '/api/admin/usuarios/:id/password'],
  [/^\/api\/admin\/aerotermia\/consumos$/, '/api/admin/aerotermia/consumos'],
  [/^\/api\/admin\/aerotermia\/facturas$/, '/api/admin/aerotermia/facturas'],
  [/^\/api\/admin\/aerotermia\/facturas\/[^/]+$/, '/api/admin/aerotermia/facturas/:id_factura'],
],
```

- [ ] **Step 3: Run all backend tests**

Run: `cd api && npx vitest run`
Expected: ALL tests PASS

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd api && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add api/src/index.ts api/src/routes/admin.ts
git commit -m "feat: registrar endpoints admin aerotermia y anadir endpoint facturas por vecino"
```

---

### Task 3: Frontend - PieChartCard component

**Files:**
- Create: `src/components/PieChartCard.tsx`

- [ ] **Step 1: Write the test**

Create `src/__tests__/PieChartCard.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PieChartCard from '../components/PieChartCard';

const mockData = [
  { piso: '1A', kwh_total: 500, porcentaje: 40, importe: 120 },
  { piso: '2A', kwh_total: 400, porcentaje: 32, importe: 96 },
  { piso: '3A', kwh_total: 350, porcentaje: 28, importe: 84 },
];

describe('PieChartCard', () => {
  it('shows empty state when no data', () => {
    render(<PieChartCard data={[]} />);
    expect(screen.getByText('No hay datos en este periodo')).toBeInTheDocument();
  });

  it('renders title', () => {
    render(<PieChartCard data={mockData} />);
    expect(screen.getByText('Distribucion por vecino')).toBeInTheDocument();
  });

  it('renders vecino names in legend', () => {
    render(<PieChartCard data={mockData} />);
    expect(screen.getByText('1A')).toBeInTheDocument();
    expect(screen.getByText('2A')).toBeInTheDocument();
    expect(screen.getByText('3A')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/PieChartCard.test.tsx`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement PieChartCard**

Create `src/components/PieChartCard.tsx`:

```typescript
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fmtMoney } from '../lib/format';

interface PieSlice {
  piso: string;
  kwh_total: number;
  porcentaje: number;
  importe: number;
}

const COLORS = ['#c0392b', '#5b8ba0', '#6f8a5c', '#b88a5e', '#8b6f5a', '#4a7c92', '#9b6b43', '#3a7d6e'];

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

function tooltipContent(props: any) {
  const { active, payload } = props;
  if (!active || !payload || !payload[0]) return null;
  const d = payload[0].payload as PieSlice;
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ fontWeight: 500, marginBottom: 4 }}>Piso {d.piso}</div>
      <div style={{ color: 'rgba(245,236,220,.7)' }}>{d.porcentaje.toFixed(1)}%</div>
      <div style={{ color: 'rgba(245,236,220,.7)' }}>{d.kwh_total.toFixed(1)} kWh</div>
      <div style={{ color: 'rgba(245,236,220,.7)' }}>{fmtMoney(d.importe)}</div>
    </div>
  );
}

function legendContent(props: any) {
  const { payload } = props;
  if (!payload) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
      {payload.map((entry: any, index: number) => {
        const d = entry.payload as PieSlice;
        return (
          <span key={d.piso} className="flex items-center gap-1.5 text-[11px] text-cocoa/50">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[index % COLORS.length] }} />
            {d.piso} ({d.porcentaje.toFixed(0)}%)
          </span>
        );
      })}
    </div>
  );
}

export default function PieChartCard({ data }: { data: PieSlice[] }) {
  if (data.length === 0) {
    return (
      <div className="glass p-[26px]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff8ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" />
            </svg>
          </div>
          <span className="eyebrow">Distribucion por vecino</span>
        </div>
        <p className="text-sm text-cocoa/44 py-8">No hay datos en este periodo</p>
      </div>
    );
  }

  return (
    <div className="glass p-[26px]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff8ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" />
          </svg>
        </div>
        <span className="eyebrow">Distribucion por vecino</span>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={110}
            paddingAngle={3}
            dataKey="kwh_total"
            nameKey="piso"
          >
            {data.map((_entry, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={tooltipContent} />
          <Legend content={legendContent} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/__tests__/PieChartCard.test.tsx`
Expected: ALL tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/PieChartCard.tsx src/__tests__/PieChartCard.test.tsx
git commit -m "feat: componente PieChartCard con distribucion por vecino"
```

---

### Task 4: Frontend - ConsumoVecinosChart component

**Files:**
- Create: `src/components/ConsumoVecinosChart.tsx`

- [ ] **Step 1: Write the test**

Create `src/__tests__/ConsumoVecinosChart.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConsumoVecinosChart from '../components/ConsumoVecinosChart';

const mockData = [
  { piso: '1A', kwh_calor: 200, kwh_frio: 50, m3_acs: 3.5, kwh_acs: 162.75 },
  { piso: '2A', kwh_calor: 150, kwh_frio: 40, m3_acs: 2.8, kwh_acs: 130.2 },
];

describe('ConsumoVecinosChart', () => {
  it('shows empty state when no data', () => {
    render(<ConsumoVecinosChart data={[]} />);
    expect(screen.getByText('No hay datos en este periodo')).toBeInTheDocument();
  });

  it('renders title', () => {
    render(<ConsumoVecinosChart data={mockData} />);
    expect(screen.getByText('Consumo por vecino')).toBeInTheDocument();
  });

  it('renders legend items', () => {
    render(<ConsumoVecinosChart data={mockData} />);
    expect(screen.getByText('Calefaccion')).toBeInTheDocument();
    expect(screen.getByText('Refrigeracion')).toBeInTheDocument();
    expect(screen.getByText('ACS')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/ConsumoVecinosChart.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement ConsumoVecinosChart**

Create `src/components/ConsumoVecinosChart.tsx`:

```typescript
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface VecinoConsumo {
  piso: string;
  kwh_calor: number;
  kwh_frio: number;
  m3_acs: number;
  kwh_acs: number;
}

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

function tooltipContent(props: any) {
  const { active, payload, label } = props;
  if (!active || !payload) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ fontWeight: 500, marginBottom: 6 }}>Piso {label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(245,236,220,.7)', gap: 12 }}>
          <span>
            <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: p.color, marginRight: 5, verticalAlign: 'middle' }} />
            {p.name}
          </span>
          <span>{Number(p.value).toFixed(1)} {p.dataKey === 'm3_acs' ? 'm³' : 'kWh'}</span>
        </div>
      ))}
    </div>
  );
}

export default function ConsumoVecinosChart({ data }: { data: VecinoConsumo[] }) {
  if (data.length === 0) {
    return (
      <div className="glass p-[26px]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff8ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
            </svg>
          </div>
          <span className="eyebrow">Consumo por vecino</span>
        </div>
        <p className="text-sm text-cocoa/44 py-8">No hay datos en este periodo</p>
      </div>
    );
  }

  return (
    <div className="glass p-[26px]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff8ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
          </svg>
        </div>
        <span className="eyebrow">Consumo por vecino</span>
      </div>

      <div className="flex items-center gap-4 mb-4 text-[11px] text-cocoa/40">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: '#c0392b' }} /> Calefaccion</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: '#5b8ba0' }} /> Refrigeracion</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: '#6f8a5c' }} /> ACS</span>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="rgba(58,47,36,.06)" vertical={false} />
          <XAxis dataKey="piso" fontSize={10} tick={{ fill: 'rgba(58,47,36,.44)' }} axisLine={false} tickLine={false} />
          <YAxis fontSize={10} tick={{ fill: 'rgba(58,47,36,.44)', fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} width={45} />
          <Tooltip content={tooltipContent} cursor={{ fill: 'rgba(58,47,36,.04)' }} />
          <Bar dataKey="kwh_calor" fill="#c0392b" radius={[3, 3, 0, 0]} />
          <Bar dataKey="kwh_frio" fill="#5b8ba0" radius={[3, 3, 0, 0]} />
          <Bar dataKey="kwh_acs" fill="#6f8a5c" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/__tests__/ConsumoVecinosChart.test.tsx`
Expected: ALL tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ConsumoVecinosChart.tsx src/__tests__/ConsumoVecinosChart.test.tsx
git commit -m "feat: componente ConsumoVecinosChart con barras por piso"
```

---

### Task 5: Frontend - FacturaSelector component

**Files:**
- Create: `src/components/FacturaSelector.tsx`

- [ ] **Step 1: Write the test**

Create `src/__tests__/FacturaSelector.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FacturaSelector from '../components/FacturaSelector';

const mockFacturas = [
  { id_factura: 'FAC-001', periodo: '2026-03-01', fecha_inicio: '2026-02-01', fecha_fin: '2026-02-28' },
  { id_factura: 'FAC-002', periodo: '2026-04-01', fecha_inicio: '2026-03-01', fecha_fin: '2026-03-31' },
];

describe('FacturaSelector', () => {
  it('renders select dropdown', () => {
    render(<FacturaSelector facturas={mockFacturas} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('shows default option', () => {
    render(<FacturaSelector facturas={mockFacturas} />);
    expect(screen.getByText('Seleccionar factura...')).toBeInTheDocument();
  });

  it('shows empty state when no facturas', () => {
    render(<FacturaSelector facturas={[]} />);
    expect(screen.getByText('No hay facturas disponibles')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/FacturaSelector.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement FacturaSelector**

Create `src/components/FacturaSelector.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { fmtMoney, fmtMonth } from '../lib/format';

interface FacturaOption {
  id_factura: string;
  periodo: string;
  fecha_inicio?: string;
  fecha_fin?: string;
}

interface FacturaDetalle {
  piso: string;
  kwh_calor: number;
  kwh_frio: number;
  kwh_acs: number;
  m3_acs: number;
  importe_total: number;
}

export default function FacturaSelector({ facturas }: { facturas: FacturaOption[] }) {
  const [selected, setSelected] = useState('');
  const [detalle, setDetalle] = useState<FacturaDetalle[]>([]);
  const [loading, setLoading] = useState(false);

  const options = facturas.reduce<FacturaOption[]>((acc, f) => {
    if (!acc.find((x) => x.id_factura === f.id_factura)) {
      acc.push(f);
    }
    return acc;
  }, []);

  useEffect(() => {
    if (!selected) {
      setDetalle([]);
      return;
    }
    setLoading(true);
    apiFetch<FacturaDetalle[]>(`/admin/aerotermia/facturas/${encodeURIComponent(selected)}`)
      .then(setDetalle)
      .catch(() => setDetalle([]))
      .finally(() => setLoading(false));
  }, [selected]);

  if (facturas.length === 0) {
    return (
      <div className="glass p-[26px]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff8ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <span className="eyebrow">Desglose por factura</span>
        </div>
        <p className="text-sm text-cocoa/44 py-8">No hay facturas disponibles</p>
      </div>
    );
  }

  return (
    <div className="glass p-[26px]">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff8ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <span className="eyebrow">Desglose por factura</span>
        </div>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="input-card text-xs py-2 px-3 min-w-[220px]"
        >
          <option value="">Seleccionar factura...</option>
          {options.map((f) => (
            <option key={f.id_factura} value={f.id_factura}>
              {f.id_factura} — {fmtMonth(f.periodo)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-cocoa/44 py-8">Cargando...</p>
      ) : selected && detalle.length > 0 ? (
        <div className="overflow-x-auto -mx-2">
          <table className="table-glass">
            <thead>
              <tr>
                <th>Piso</th>
                <th>kWh Calor</th>
                <th>kWh Frio</th>
                <th>kWh ACS</th>
                <th>m³ ACS</th>
                <th className="text-right">Importe</th>
              </tr>
            </thead>
            <tbody>
              {detalle.map((d, i) => (
                <tr key={d.piso} className="row-stagger" style={{ animationDelay: `${i * 40}ms` }}>
                  <td className="font-medium text-cocoa">{d.piso}</td>
                  <td className="font-mono text-xs font-num">{Number(d.kwh_calor).toFixed(0)}</td>
                  <td className="font-mono text-xs font-num">{Number(d.kwh_frio).toFixed(0)}</td>
                  <td className="font-mono text-xs font-num">{Number(d.kwh_acs).toFixed(0)}</td>
                  <td className="font-mono text-xs font-num">{Number(d.m3_acs).toFixed(1)}</td>
                  <td className="font-mono text-xs text-right font-medium font-num">{fmtMoney(d.importe_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : selected ? (
        <p className="text-sm text-cocoa/44 py-8">Sin datos para esta factura</p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/__tests__/FacturaSelector.test.tsx`
Expected: ALL tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/FacturaSelector.tsx src/__tests__/FacturaSelector.test.tsx
git commit -m "feat: componente FacturaSelector con dropdown y tabla detalle"
```

---

### Task 6: Frontend - HeatmapChart component

**Files:**
- Create: `src/components/HeatmapChart.tsx`

- [ ] **Step 1: Write the test**

Create `src/__tests__/HeatmapChart.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HeatmapChart from '../components/HeatmapChart';

const mockData = [
  { piso: '1A', periodo: '2026-01', kwh_calor: 200, kwh_frio: 10, kwh_acs: 50, m3_acs: 2 },
  { piso: '1A', periodo: '2026-02', kwh_calor: 180, kwh_frio: 15, kwh_acs: 45, m3_acs: 1.8 },
  { piso: '2A', periodo: '2026-01', kwh_calor: 150, kwh_frio: 8, kwh_acs: 40, m3_acs: 1.5 },
  { piso: '2A', periodo: '2026-02', kwh_calor: 140, kwh_frio: 12, kwh_acs: 38, m3_acs: 1.4 },
];

describe('HeatmapChart', () => {
  it('shows empty state when no data', () => {
    render(<HeatmapChart data={[]} />);
    expect(screen.getByText('No hay datos disponibles')).toBeInTheDocument();
  });

  it('renders title', () => {
    render(<HeatmapChart data={mockData} />);
    expect(screen.getByText('Heatmap mensual')).toBeInTheDocument();
  });

  it('renders piso labels', () => {
    render(<HeatmapChart data={mockData} />);
    expect(screen.getByText('1A')).toBeInTheDocument();
    expect(screen.getByText('2A')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/HeatmapChart.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement HeatmapChart**

Create `src/components/HeatmapChart.tsx`:

```typescript
import { useMemo } from 'react';

interface HeatmapDatum {
  piso: string;
  periodo: string;
  kwh_calor: number;
  kwh_frio: number;
  kwh_acs: number;
  m3_acs: number;
}

function colorScale(value: number, max: number): string {
  if (max === 0) return 'rgba(184,138,94,0.05)';
  const intensity = value / max;
  if (intensity === 0) return 'rgba(184,138,94,0.05)';
  const r = 184;
  const g = Math.round(138 * (1 - intensity * 0.7));
  const b = Math.round(94 * (1 - intensity * 0.8));
  const alpha = 0.15 + intensity * 0.85;
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function HeatmapChart({ data }: { data: HeatmapDatum[] }) {
  const { pisos, periodos, matrix, maxKwh } = useMemo(() => {
    const uniquePisos = [...new Set(data.map((d) => d.piso))].sort();
    const uniquePeriodos = [...new Set(data.map((d) => d.periodo))].sort();
    const map = new Map<string, number>();
    let max = 0;
    data.forEach((d) => {
      const key = `${d.piso}__${d.periodo}`;
      const total = d.kwh_calor + d.kwh_frio + d.kwh_acs;
      map.set(key, total);
      if (total > max) max = total;
    });
    return { pisos: uniquePisos, periodos: uniquePeriodos, matrix: map, maxKwh: max };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="glass p-[26px]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff8ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
          </div>
          <span className="eyebrow">Heatmap mensual</span>
        </div>
        <p className="text-sm text-cocoa/44 py-8">No hay datos disponibles</p>
      </div>
    );
  }

  return (
    <div className="glass p-[26px]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff8ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
          </svg>
        </div>
        <span className="eyebrow">Heatmap mensual</span>
        <span className="text-[11px] text-cocoa/40 font-num">kWh totales</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left font-medium text-cocoa/40 uppercase tracking-wider py-1 pr-3 text-[10px]">Piso</th>
              {periodos.map((p) => (
                <th key={p} className="text-center font-medium text-cocoa/40 uppercase tracking-wider py-1 px-2 text-[10px]">
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pisos.map((piso) => (
              <tr key={piso}>
                <td className="font-medium text-cocoa py-1 pr-3 text-[11px]">{piso}</td>
                {periodos.map((periodo) => {
                  const val = matrix.get(`${piso}__${periodo}`) ?? 0;
                  return (
                    <td key={periodo} className="p-1">
                      <div
                        className="rounded-md flex items-center justify-center min-w-[48px] h-[36px] font-mono text-[10px] text-cocoa/70 transition-colors cursor-default hover:ring-1 hover:ring-accent/20"
                        style={{ background: colorScale(val, maxKwh) }}
                        title={`${piso} - ${periodo}: ${val.toFixed(1)} kWh`}
                      >
                        {val > 0 ? val.toFixed(0) : '—'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 mt-4 justify-end text-[10px] text-cocoa/40">
        <span>Min</span>
        <div className="flex h-3 rounded-sm overflow-hidden">
          <div className="w-5" style={{ background: colorScale(maxKwh * 0.1, maxKwh) }} />
          <div className="w-5" style={{ background: colorScale(maxKwh * 0.3, maxKwh) }} />
          <div className="w-5" style={{ background: colorScale(maxKwh * 0.5, maxKwh) }} />
          <div className="w-5" style={{ background: colorScale(maxKwh * 0.7, maxKwh) }} />
          <div className="w-5" style={{ background: colorScale(maxKwh * 0.9, maxKwh) }} />
        </div>
        <span>Max</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/__tests__/HeatmapChart.test.tsx`
Expected: ALL tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/HeatmapChart.tsx src/__tests__/HeatmapChart.test.tsx
git commit -m "feat: componente HeatmapChart mensual por piso"
```

---

### Task 7: Frontend - Update AdminAerotermiaPage

**Files:**
- Modify: `src/pages/AdminAerotermiaPage.tsx`

- [ ] **Step 1: Write the page test**

Create `src/__tests__/AdminAerotermiaPage.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminAerotermiaPage from '../pages/AdminAerotermiaPage';

vi.mock('../api/client', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('../store/auth', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 1, email: 'admin@test.com', vecino_piso: null, is_admin: true },
    loading: false,
  })),
}));

import { apiFetch } from '../api/client';
const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminAerotermiaPage />
    </MemoryRouter>
  );
}

describe('AdminAerotermiaPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders header title', async () => {
    mockApiFetch.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Aerotermia Admin')).toBeInTheDocument();
    });
  });

  it('renders eyebrow', async () => {
    mockApiFetch.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Panel de administracion')).toBeInTheDocument();
    });
  });

  it('fetches facturas and consumos on mount', async () => {
    mockApiFetch.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith('/admin/aerotermia/facturas');
    });
  });

  it('shows sections when data is loaded', async () => {
    mockApiFetch.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Distribucion por vecino')).toBeInTheDocument();
      expect(screen.getByText('Consumo por vecino')).toBeInTheDocument();
      expect(screen.getByText('Historico — Global')).toBeInTheDocument();
      expect(screen.getByText('No hay facturas disponibles')).toBeInTheDocument();
      expect(screen.getByText('Desglose por factura')).toBeInTheDocument();
      expect(screen.getByText('Heatmap mensual')).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/AdminAerotermiaPage.test.tsx`
Expected: FAIL (still shows "Proximamente" text, not "Aerotermia Admin")

- [ ] **Step 3: Replace the placeholder page**

Write `src/pages/AdminAerotermiaPage.tsx`:

```typescript
import { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '../api/client';
import Header from '../components/Header';
import HistoricoCharts from '../components/HistoricoCharts';
import FacturasChart from '../components/FacturasChart';
import PieChartCard from '../components/PieChartCard';
import ConsumoVecinosChart from '../components/ConsumoVecinosChart';
import FacturaSelector from '../components/FacturaSelector';
import HeatmapChart from '../components/HeatmapChart';

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
  kwh_calor: number;
  kwh_frio: number;
  kwh_acs: number;
  m3_acs: number;
  importe_calor: number;
  importe_frio: number;
  importe_acs: number;
  fecha_factura_inicio?: string;
  fecha_factura_fin?: string;
}

export default function AdminAerotermiaPage() {
  const [consumos, setConsumos] = useState<ConsumoAgregado[]>([]);
  const [facturas, setFacturas] = useState<FacturaGlobal[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<'24h' | '7d' | '30d' | '1a' | null>('7d');
  const [desdeInput, setDesdeInput] = useState('');
  const [hastaInput, setHastaInput] = useState('');

  const setRange = (p: string) => {
    setPreset(p as '24h' | '7d' | '30d' | '1a');
    if (p) {
      const { desde, hasta } = applyPreset(p as '24h' | '7d' | '30d' | '1a');
      setDesdeInput(toDatetimeLocal(desde));
      setHastaInput(toDatetimeLocal(hasta));
    }
  };

  useEffect(() => { setRange('7d'); }, []);

  const desde = desdeInput ? fromDatetimeLocal(desdeInput) : '';
  const hasta = hastaInput ? fromDatetimeLocal(hastaInput) : '';

  useEffect(() => {
    apiFetch<FacturaGlobal[]>('/admin/aerotermia/facturas')
      .then(setFacturas)
      .catch(() => setFacturas([]));
  }, []);

  useEffect(() => {
    if (!desde || !hasta) return;
    const qs = `?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`;
    apiFetch<ConsumoAgregado[]>(`/admin/aerotermia/consumos${qs}`)
      .then(setConsumos)
      .catch(() => setConsumos([]))
      .finally(() => setLoading(false));
  }, [desde, hasta]);

  const stats = useMemo(() => {
    const totalCalor = consumos.reduce((sum, c) => sum + Number(c.kwh_calor), 0);
    const totalFrio = consumos.reduce((sum, c) => sum + Number(c.kwh_frio), 0);
    const totalAcs = consumos.reduce((sum, c) => sum + Number(c.m3_acs), 0);
    const totalEuros = facturas.reduce((sum, f) => sum + Number(f.importe_total), 0);
    return { totalCalor, totalFrio, totalAcs, totalEuros };
  }, [consumos, facturas]);

  const pieData = useMemo(() => {
    const map = new Map<string, { kwh_total: number; importe: number }>();
    facturas.forEach((f) => {
      const prev = map.get(f.piso) || { kwh_total: 0, importe: 0 };
      map.set(f.piso, {
        kwh_total: prev.kwh_total + Number(f.kwh_calor) + Number(f.kwh_frio) + Number(f.kwh_acs),
        importe: prev.importe + Number(f.importe_total),
      });
    });
    const total = Array.from(map.values()).reduce((s, v) => s + v.kwh_total, 0);
    return Array.from(map.entries())
      .map(([piso, v]) => ({
        piso,
        kwh_total: v.kwh_total,
        porcentaje: total > 0 ? (v.kwh_total / total) * 100 : 0,
        importe: v.importe,
      }))
      .filter((d) => d.kwh_total > 0)
      .sort((a, b) => b.kwh_total - a.kwh_total);
  }, [facturas]);

  const vecinosConsumo = useMemo(() => {
    const map = new Map<string, { kwh_calor: number; kwh_frio: number; m3_acs: number; kwh_acs: number }>();
    facturas.forEach((f) => {
      const prev = map.get(f.piso) || { kwh_calor: 0, kwh_frio: 0, m3_acs: 0, kwh_acs: 0 };
      map.set(f.piso, {
        kwh_calor: prev.kwh_calor + Number(f.kwh_calor),
        kwh_frio: prev.kwh_frio + Number(f.kwh_frio),
        m3_acs: prev.m3_acs + Number(f.m3_acs),
        kwh_acs: prev.kwh_acs + Number(f.kwh_acs),
      });
    });
    return Array.from(map.entries())
      .map(([piso, v]) => ({ piso, ...v }))
      .sort((a, b) => a.piso.localeCompare(b.piso));
  }, [facturas]);

  const facturasGlobal = useMemo(() => {
    const map = new Map<string, FacturaGlobal>();
    facturas.forEach((f) => {
      const prev = map.get(f.id_factura);
      if (prev) {
        prev.importe_total += Number(f.importe_total);
        prev.kwh_calor += Number(f.kwh_calor);
        prev.kwh_frio += Number(f.kwh_frio);
        prev.kwh_acs += Number(f.kwh_acs);
        prev.m3_acs += Number(f.m3_acs);
        prev.importe_calor += Number(f.importe_calor);
        prev.importe_frio += Number(f.importe_frio);
        prev.importe_acs += Number(f.importe_acs);
      } else {
        map.set(f.id_factura, {
          ...f,
          importe_total: Number(f.importe_total),
          kwh_calor: Number(f.kwh_calor),
          kwh_frio: Number(f.kwh_frio),
          kwh_acs: Number(f.kwh_acs),
          m3_acs: Number(f.m3_acs),
          importe_calor: Number(f.importe_calor),
          importe_frio: Number(f.importe_frio),
          importe_acs: Number(f.importe_acs),
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.periodo.localeCompare(a.periodo));
  }, [facturas]);

  const heatmapData = useMemo(() => {
    return facturas.map((f) => {
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
  }, [facturas]);

  const uniqueFacturas = useMemo(() => {
    const seen = new Set<string>();
    return facturas.filter((f) => {
      if (seen.has(f.id_factura)) return false;
      seen.add(f.id_factura);
      return true;
    }).map((f) => ({ id_factura: f.id_factura, periodo: f.periodo }));
  }, [facturas]);

  if (loading) {
    return (
      <div>
        <Header />
        <main className="max-w-[1180px] mx-auto px-6 flex items-center justify-center min-h-[60vh]">
          <div className="text-cocoa/40 text-sm">Cargando datos del edificio...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-in">
      <Header />

      <main className="max-w-[1180px] mx-auto px-6 flex flex-col gap-[22px] pb-10">
        <div className="pt-2">
          <p className="eyebrow">Panel de administracion</p>
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

        <div className="stagger flex flex-col gap-[22px]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-[16px]">
            {[
              { label: 'Total kWh calor', value: stats.totalCalor.toFixed(1), unit: 'kWh', iconBg: 'var(--calor)' },
              { label: 'Total kWh frio', value: stats.totalFrio.toFixed(1), unit: 'kWh', iconBg: 'var(--frio)' },
              { label: 'Total m³ ACS', value: stats.totalAcs.toFixed(2), unit: 'm³', iconBg: 'var(--sage)' },
              { label: 'Total facturado', value: stats.totalEuros.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €', unit: '', iconBg: 'var(--accent)' },
            ].map((s) => (
              <div key={s.label} className="glass p-[20px]">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: s.iconBg }}>
                    <span className="text-cream text-[10px] font-bold">{s.unit.charAt(0)}</span>
                  </div>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-cocoa/40">{s.label}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-[32px] font-medium leading-none text-cocoa" style={{ letterSpacing: '-0.02em' }}>
                    {s.value}
                  </span>
                  {s.unit && <span className="font-mono text-[11px] text-cocoa/40 font-num">{s.unit}</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 glass p-[26px]">
            <span className="eyebrow shrink-0">Periodo</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRange('24h')}
                className={`text-[11px] font-medium uppercase tracking-[0.05em] px-2.5 py-1.5 rounded-md transition-colors ${preset === '24h' ? 'text-cocoa bg-accent/12' : 'text-cocoa/40 hover:text-cocoa'}`}
              >24h</button>
              <button
                onClick={() => setRange('7d')}
                className={`text-[11px] font-medium uppercase tracking-[0.05em] px-2.5 py-1.5 rounded-md transition-colors ${preset === '7d' ? 'text-cocoa bg-accent/12' : 'text-cocoa/40 hover:text-cocoa'}`}
              >7 dias</button>
              <button
                onClick={() => setRange('30d')}
                className={`text-[11px] font-medium uppercase tracking-[0.05em] px-2.5 py-1.5 rounded-md transition-colors ${preset === '30d' ? 'text-cocoa bg-accent/12' : 'text-cocoa/40 hover:text-cocoa'}`}
              >30 dias</button>
              <button
                onClick={() => setRange('1a')}
                className={`text-[11px] font-medium uppercase tracking-[0.05em] px-2.5 py-1.5 rounded-md transition-colors ${preset === '1a' ? 'text-cocoa bg-accent/12' : 'text-cocoa/40 hover:text-cocoa'}`}
              >1 ano</button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-medium uppercase tracking-wider text-cocoa/40 shrink-0">Desde:</label>
              <input type="datetime-local" value={desdeInput} onChange={(e) => { setDesdeInput(e.target.value); setPreset(null); }} className="input-card text-xs py-1.5 px-3" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-medium uppercase tracking-wider text-cocoa/40 shrink-0">Hasta:</label>
              <input type="datetime-local" value={hastaInput} onChange={(e) => { setHastaInput(e.target.value); setPreset(null); }} className="input-card text-xs py-1.5 px-3" />
            </div>
          </div>

          <PieChartCard data={pieData} />

          <ConsumoVecinosChart data={vecinosConsumo} />

          <HistoricoCharts endpoint="/admin/aerotermia/consumos" title="Historico — Global" />

          <FacturasChart data={facturasGlobal} />

          <FacturaSelector facturas={uniqueFacturas} />

          <HeatmapChart data={heatmapData} />
        </div>
      </main>
    </div>
  );
}

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

function applyPreset(preset: '24h' | '7d' | '30d' | '1a'): { desde: string; hasta: string } {
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
```

- [ ] **Step 4: Run page tests**

Run: `npm test -- src/__tests__/AdminAerotermiaPage.test.tsx`
Expected: ALL tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/AdminAerotermiaPage.tsx src/__tests__/AdminAerotermiaPage.test.tsx
git commit -m "feat: dashboard admin aerotermia completo con stats, graficas y heatmap"
```

---

### Task 8: Build verification

- [ ] **Step 1: Run all frontend tests**

Run: `npm test`
Expected: ALL tests PASS

- [ ] **Step 2: Run frontend build**

Run: `npm run build`
Expected: Build succeeds, no errors

- [ ] **Step 3: Run all backend tests**

Run: `cd api && npx vitest run`
Expected: ALL tests PASS

- [ ] **Step 4: Run backend type check**

Run: `cd api && npx tsc --noEmit`
Expected: No errors

---

### Task 9: Polish & review

- [ ] **Step 1: Run full project verification**

```bash
npm test && npm run build && cd api && npx vitest run && npx tsc --noEmit
```
Expected: All pass

- [ ] **Step 2: Review all changed files**

```bash
git diff --stat HEAD~7..HEAD
```
Expected: ~14 files changed (routes, components, pages, tests)

- [ ] **Step 3: Commit any remaining changes if any**
