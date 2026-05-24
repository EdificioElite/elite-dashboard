# Modo aerotermia (calefaccion/refrigeracion) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compute and display the aerotermia operating mode (calefaccion/refrigeracion/desconocido) from the flow temperature, on the backend API and in the ConsumoCard "Estado" column.

**Architecture:** Backend adds a computed `modo` field to `GET /consumo-actual` based on `temp_impulsion`. Frontend receives it and renders a color-coded label above the Impulsion/Retorno lines in ConsumoCard's Estado column.

**Tech Stack:** Express + TypeScript (backend), React + TypeScript + Tailwind (frontend), Vitest for both.

---

### Task 1: Backend — Add `modo` field to `/consumo-actual`

**Files:**
- Modify: `api/src/routes/consumos.ts:113-148`
- Test: `api/src/__tests__/routes.test.ts` (add cases in `GET /api/consumo-actual` describe block at ~line 538)

- [ ] **Step 1: Add `modo` computation in the route handler**

In `api/src/routes/consumos.ts`, after line 136 (`return;`) and before line 139 (`res.json(result.rows[0]);`), add logic to compute `modo` from `temp_impulsion` and attach it to the row before sending:

```typescript
      const row = result.rows[0] as Record<string, unknown>;
      const t = row.temp_impulsion as number | null;
      if (t == null) {
        row.modo = 'desconocido';
      } else if (t > 29) {
        row.modo = 'calefaccion';
      } else if (t < 21) {
        row.modo = 'refrigeracion';
      } else {
        row.modo = 'desconocido';
      }

      res.json(row);
```

This replaces the existing line `res.json(result.rows[0]);` with the above block.

- [ ] **Step 2: Add backend tests for `modo`**

In `api/src/__tests__/routes.test.ts`, inside the `describe('GET /api/consumo-actual', ...)` block (starts at line 538), after the existing tests:

Add these test cases:

```typescript
    it('returns modo calefaccion when temp_impulsion > 29', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ timestamp: '2026-01-01T12:00:00Z', kwh_calor: 2.0, kwh_frio: 0.5, m3_acs: 0.03, kwh_acs: 1.395, temp_impulsion: 42.0, temp_retorno: 35.0 }],
      });
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .get('/api/consumo-actual')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.modo).toBe('calefaccion');
    });

    it('returns modo refrigeracion when temp_impulsion < 21', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ timestamp: '2026-01-01T12:00:00Z', kwh_calor: 2.0, kwh_frio: 0.5, m3_acs: 0.03, kwh_acs: 1.395, temp_impulsion: 7.0, temp_retorno: 12.0 }],
      });
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .get('/api/consumo-actual')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.modo).toBe('refrigeracion');
    });

    it('returns modo desconocido when temp_impulsion between 21 and 29', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ timestamp: '2026-01-01T12:00:00Z', kwh_calor: 2.0, kwh_frio: 0.5, m3_acs: 0.03, kwh_acs: 1.395, temp_impulsion: 25.0, temp_retorno: 20.0 }],
      });
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .get('/api/consumo-actual')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.modo).toBe('desconocido');
    });

    it('returns modo desconocido when temp_impulsion is null', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ timestamp: '2026-01-01T12:00:00Z', kwh_calor: 2.0, kwh_frio: 0.5, m3_acs: 0.03, kwh_acs: 1.395, temp_impulsion: null, temp_retorno: null }],
      });
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .get('/api/consumo-actual')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.modo).toBe('desconocido');
    });
```

- [ ] **Step 3: Run backend tests**

```bash
cd api && npm test
```

Expected: All tests pass, including the new `modo` test cases.

- [ ] **Step 4: Verify backend TypeScript compilation**

```bash
cd api && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 5: Commit backend changes**

```bash
git add api/src/routes/consumos.ts api/src/__tests__/routes.test.ts
git commit -m "feat(api): añadir campo modo a /consumo-actual basado en temp_impulsion"
```

---

### Task 2: Frontend — Display `modo` in ConsumoCard

**Files:**
- Modify: `src/components/ConsumoCard.tsx:4-22` (interface), `src/components/ConsumoCard.tsx:93-118` (Estado column)
- Modify: `src/components/ConsumoCard.test.tsx` (add test cases)

- [ ] **Step 2.1: Add `modo` to `ConsumoActual` interface**

In `src/components/ConsumoCard.tsx`, add `modo` field to the interface (line 18, after `power_w`):

```typescript
  power_w: number | null;
  modo?: "calefaccion" | "refrigeracion" | "desconocido";
  sparkline_calor?: number[];
```

- [ ] **Step 2.2: Add mode display in Estado column**

In `src/components/ConsumoCard.tsx`, inside the Estado column div (after line 93 and before line 94), add a mode indicator line above the on/off status:

```tsx
          <div className="text-[11px] font-medium uppercase tracking-wider text-cocoa/40 mb-1">Estado</div>
          {data.modo && (
            <div className="text-[12px] font-semibold mb-1" style={{
              color: data.modo === 'calefaccion' ? '#a3402a'
                : data.modo === 'refrigeracion' ? '#3b82f6'
                : '#9ca3af',
            }}>
              {data.modo === 'calefaccion' ? 'Calefaccion'
                : data.modo === 'refrigeracion' ? 'Refrigeracion'
                : 'Desconocido'}
            </div>
          )}
          <div className="flex items-center gap-1.5 mb-1">
```

The full updated Estado column (lines 92-118) becomes:

```tsx
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-cocoa/40 mb-1">Estado</div>
          {data.modo && (
            <div className="text-[12px] font-semibold mb-1" style={{
              color: data.modo === 'calefaccion' ? '#a3402a'
                : data.modo === 'refrigeracion' ? '#3b82f6'
                : '#9ca3af',
            }}>
              {data.modo === 'calefaccion' ? 'Calefaccion'
                : data.modo === 'refrigeracion' ? 'Refrigeracion'
                : 'Desconocido'}
            </div>
          )}
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
```

- [ ] **Step 2.3: Update existing frontend tests to include `modo`**

In `src/components/ConsumoCard.test.tsx`, update the test data objects to include the `modo` field. The existing test at line 11-37 (first data-display test) should add `modo: 'calefaccion'`:

Change line 19 from:
```typescript
          temp_impulsion: 42, temp_retorno: 32, power_w: 150,
```
to:
```typescript
          temp_impulsion: 42, temp_retorno: 32, power_w: 150, modo: 'calefaccion',
```

Add assertions after line 36:
```typescript
    expect(screen.getByText('Calefaccion')).toBeInTheDocument();
```

But wait -- there's already `screen.getByText('Calefacción')` at line 26 (the column header). The mode label would be "Calefaccion" (without accent). Let me verify: in the component we show column headers "Calefacción", "Refrigeración", "ACS", and "Estado". The mode label uses "Calefaccion", "Refrigeracion", "Desconocido" without accents. So searching for "Calefaccion" vs "Calefacción" should be distinguishable.

Add to the test at line 36:
```typescript
    expect(screen.getByText('Contadores de Aerotermia en vivo')).toBeInTheDocument();
    expect(screen.getByText('Calefaccion')).toBeInTheDocument();
```

- [ ] **Step 2.4: Add new frontend test for each mode**

Add new test cases at the end of `ConsumoCard.test.tsx`:

```typescript
  it('displays Refrigeracion mode in azul', () => {
    render(
      <ConsumoCard
        data={{
          timestamp: '2026-01-01T12:00:00Z',
          kwh_calor: 1, kwh_frio: 5, m3_acs: 0.01, kwh_acs: 2,
          kwh_calor_abs: 1, kwh_frio_abs: 5, m3_acs_abs: 0.01,
          kwh_calor_mes_inicio: null, kwh_frio_mes_inicio: null, m3_acs_mes_inicio: null,
          temp_impulsion: 7, temp_retorno: 12, power_w: 2000,
          modo: 'refrigeracion',
        }}
      />
    );
    expect(screen.getByText('Refrigeracion')).toBeInTheDocument();
  });

  it('displays Desconocido mode in gris', () => {
    render(
      <ConsumoCard
        data={{
          timestamp: '2026-01-01T12:00:00Z',
          kwh_calor: 1, kwh_frio: 0, m3_acs: 0.01, kwh_acs: 2,
          kwh_calor_abs: 1, kwh_frio_abs: 0, m3_acs_abs: 0.01,
          kwh_calor_mes_inicio: null, kwh_frio_mes_inicio: null, m3_acs_mes_inicio: null,
          temp_impulsion: 25, temp_retorno: 20, power_w: 100,
          modo: 'desconocido',
        }}
      />
    );
    expect(screen.getByText('Desconocido')).toBeInTheDocument();
  });

  it('does not show mode label when modo is absent', () => {
    render(
      <ConsumoCard
        data={{
          timestamp: '2026-01-01T12:00:00Z',
          kwh_calor: 1, kwh_frio: 0, m3_acs: 0.01, kwh_acs: 2,
          kwh_calor_abs: 1, kwh_frio_abs: 0, m3_acs_abs: 0.01,
          kwh_calor_mes_inicio: null, kwh_frio_mes_inicio: null, m3_acs_mes_inicio: null,
          temp_impulsion: null, temp_retorno: null, power_w: null,
        }}
      />
    );
    expect(screen.queryByText('Calefaccion')).not.toBeInTheDocument();
    expect(screen.queryByText('Refrigeracion')).not.toBeInTheDocument();
    expect(screen.queryByText('Desconocido')).not.toBeInTheDocument();
    expect(screen.getByText('Apagado')).toBeInTheDocument();
  });
```

- [ ] **Step 2.5: Run frontend tests**

```bash
npm test
```

Expected: All frontend tests pass.

- [ ] **Step 2.6: Verify frontend TypeScript compilation**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 2.7: Commit frontend changes**

```bash
git add src/components/ConsumoCard.tsx src/components/ConsumoCard.test.tsx
git commit -m "feat: mostrar modo aerotermia (calefaccion/refrigeracion/desconocido) en ConsumoCard"
```
