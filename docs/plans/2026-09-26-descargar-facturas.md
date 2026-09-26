# Descarga de facturas de aerotermia — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir a los vecinos descargar sus facturas de aerotermia en PDF desde Google Drive, y a admin/directiva descargar cualquier factura, reutilizando el proxy existente de `juntas`.

**Architecture:** El backend expone `drive_file_id` como booleano `tiene_pdf` en los listados de facturas (sin exponer el id) y dos endpoints de descarga que hacen proxy de Google Drive vía `getPDFStream`. El frontend añade una fila "Descargar" en `FacturasTable` (vecino) y hace clicable el precio total en el pivote de `AdminAerotermiaPage` (admin).

**Tech Stack:** Express + TypeScript + `pg` (backend), React + Tailwind + Vitest (frontend). Google Drive vía `googleapis`.

---

## File Structure

- `api/src/routes/facturas.ts` — añade `tiene_pdf` al listado de vecino y el endpoint `GET /facturas/:id_factura/descargar`.
- `api/src/routes/adminAerotermia.ts` — añade `tiene_pdf` al listado de admin y `GET /admin/aerotermia/facturas/:id_factura/descargar`.
- `api/src/index.ts` — registra los nuevos patrones en `normalizePath`.
- `src/api/client.ts` — función `downloadFacturaPDF`.
- `src/components/FacturasTable.tsx` — fila "Descargar" + prop `downloadPiso`.
- `src/pages/DashboardPage.tsx` — `tiene_pdf` en la interfaz `Factura` y prop `downloadPiso`.
- `src/pages/AdminAerotermiaPage.tsx` — `tiene_pdf` en `FacturaGlobal` y celda clicable.

Tests:
- `api/src/__tests__/routes.test.ts` — descarga de factura de vecino.
- `api/src/__tests__/adminAerotermia.test.ts` — descarga de factura admin.
- `src/components/FacturasTable.test.tsx` — botón condicional.
- `src/__tests__/AdminAerotermiaPage.test.tsx` — celda clicable.

---

## Task 1: Backend — `tiene_pdf` + endpoint de descarga del vecino

**Files:**
- Modify: `api/src/routes/facturas.ts`
- Test: `api/src/__tests__/routes.test.ts`

- [ ] **Step 1: Añadir mock de googleDrive y tests que fallan en `routes.test.ts`**

Añade al inicio de `api/src/__tests__/routes.test.ts`, junto al resto de imports (`import { describe, it, expect, vi, beforeEach } from 'vitest';`), el import de `Readable`:

```ts
import { Readable } from 'stream';
```

Añade el mock de googleDrive justo después del mock de `../db`:

```ts
vi.mock('../lib/googleDrive', () => ({
  getPDFStream: vi.fn(),
  uploadPDF: vi.fn(),
  deleteFile: vi.fn(),
  renameFile: vi.fn(),
}));
```

Justo después de `const mockQuery = query as ReturnType<typeof vi.fn>;` añade:

```ts
import { getPDFStream } from '../lib/googleDrive';
const mockGetPDFStream = getPDFStream as ReturnType<typeof vi.fn>;
```

Dentro del bloque `describe('Facturas routes', ...)`, después del `describe('GET /api/facturas', ...)` existente, añade este nuevo `describe`:

```ts
  describe('GET /api/facturas/:id_factura/descargar', () => {
    it('returns 401 without token', async () => {
      const app = createApp();
      const res = await request(app).get('/api/facturas/1A-2026-01/descargar');
      expect(res.status).toBe(401);
    });

    it('returns 404 when factura not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const res = await request(app)
        .get('/api/facturas/1A-2026-01/descargar')
        .set('Authorization', `Bearer ${userToken()}`);
      expect(res.status).toBe(404);
    });

    it('returns 404 when factura belongs to another piso', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ piso: '2A', drive_file_id: 'drive-123' }] });
      const app = createApp();
      const res = await request(app)
        .get('/api/facturas/2A-2026-01/descargar')
        .set('Authorization', `Bearer ${userToken()}`);
      expect(res.status).toBe(404);
    });

    it('returns 404 when factura has no file', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ piso: '1A', drive_file_id: null }] });
      const app = createApp();
      const res = await request(app)
        .get('/api/facturas/1A-2026-01/descargar')
        .set('Authorization', `Bearer ${userToken()}`);
      expect(res.status).toBe(404);
    });

    it('streams PDF when file exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ piso: '1A', drive_file_id: 'drive-123' }] });
      mockGetPDFStream.mockResolvedValueOnce(Readable.from(['fake-pdf-content']));
      const app = createApp();
      const res = await request(app)
        .get('/api/facturas/1A-2026-01/descargar')
        .set('Authorization', `Bearer ${userToken()}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment');
    });
  });
```

Dentro del `describe('GET /api/facturas', ...)` existente añade este test (verifica que el SQL expone `tiene_pdf`):

```ts
    it('exposes tiene_pdf from drive_file_id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      await request(app)
        .get('/api/facturas')
        .set('Authorization', `Bearer ${userToken()}`);
      const sql = mockQuery.mock.calls[0][0];
      expect(sql).toContain('drive_file_id');
      expect(sql).toContain('tiene_pdf');
    });
```

- [ ] **Step 2: Ejecutar tests y verificar que fallan**

Run: `cd api && npx vitest run src/__tests__/routes.test.ts`
Expected: FAIL — `Cannot GET /api/facturas/1A-2026-01/descargar` (404/500) en los tests nuevos.

- [ ] **Step 3: Implementar en `api/src/routes/facturas.ts`**

Sustituye la primera línea de imports y añade el import de `getPDFStream`:

```ts
import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../lib/logger';
import { getPDFStream } from '../lib/googleDrive';
```

En el `SELECT` del `GET /facturas`, añade la línea `(f.drive_file_id IS NOT NULL) AS tiene_pdf` justo después de `f.fecha_factura_fin`:

```sql
        f.fecha_factura_inicio,
        f.fecha_factura_fin,
        (f.drive_file_id IS NOT NULL) AS tiene_pdf
      FROM facturas f
```

Antes de `export default router;` añade el nuevo endpoint:

```ts
router.get('/facturas/:id_factura/descargar', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id_factura } = req.params;
    const pisoQuery = req.query.piso as string | undefined;
    const role = req.user!.role;
    const vecinoPiso = ((role === 'admin' || role === 'directiva') && pisoQuery) ? pisoQuery : req.user!.vecinoPiso;

    const result = await query(
      'SELECT piso, drive_file_id FROM facturas WHERE id_factura = $1',
      [id_factura]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Factura no encontrada' });
      return;
    }

    const factura = result.rows[0];
    if (!vecinoPiso || factura.piso !== vecinoPiso) {
      res.status(404).json({ error: 'Factura no encontrada' });
      return;
    }

    if (!factura.drive_file_id) {
      res.status(404).json({ error: 'Esta factura no tiene archivo adjunto' });
      return;
    }

    const fileName = `factura-${id_factura}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    const stream = await getPDFStream(factura.drive_file_id);
    stream.pipe(res);
  } catch (err) {
    logger.error(err, 'Download factura PDF error');
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error al descargar el archivo' });
    }
  }
});

export default router;
```

- [ ] **Step 4: Ejecutar tests y verificar que pasan**

Run: `cd api && npx vitest run src/__tests__/routes.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck backend**

Run: `cd api && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add api/src/routes/facturas.ts api/src/__tests__/routes.test.ts
git commit -m "feat: endpoint de descarga de factura para vecino"
```

---

## Task 2: Backend — `tiene_pdf` + endpoint de descarga admin

**Files:**
- Modify: `api/src/routes/adminAerotermia.ts`
- Test: `api/src/__tests__/adminAerotermia.test.ts`

- [ ] **Step 1: Añadir mock de googleDrive y tests que fallan en `adminAerotermia.test.ts`**

Añade el import de `Readable` junto a los demás imports:

```ts
import { Readable } from 'stream';
```

Añade el mock de googleDrive justo después del mock de `../db`:

```ts
vi.mock('../lib/googleDrive', () => ({
  getPDFStream: vi.fn(),
  uploadPDF: vi.fn(),
  deleteFile: vi.fn(),
  renameFile: vi.fn(),
}));
```

Después de `const mockQuery = query as ReturnType<typeof vi.fn>;` añade:

```ts
import { getPDFStream } from '../lib/googleDrive';
const mockGetPDFStream = getPDFStream as ReturnType<typeof vi.fn>;
```

Dentro del `describe('GET /api/admin/aerotermia/facturas', ...)` añade este test (verifica `tiene_pdf` en el SQL):

```ts
    it('exposes tiene_pdf from drive_file_id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      await request(app)
        .get('/api/admin/aerotermia/facturas')
        .set('Authorization', `Bearer ${adminToken()}`);
      const sql = mockQuery.mock.calls[0][0];
      expect(sql).toContain('drive_file_id');
      expect(sql).toContain('tiene_pdf');
    });
```

Después del `describe('GET /api/admin/aerotermia/facturas', ...)` añade este nuevo `describe`:

```ts
  describe('GET /api/admin/aerotermia/facturas/:id_factura/descargar', () => {
    it('rejects non-admin users with 403', async () => {
      const app = createApp();
      const res = await request(app)
        .get('/api/admin/aerotermia/facturas/FAC-001/descargar')
        .set('Authorization', `Bearer ${userToken()}`);
      expect(res.status).toBe(403);
    });

    it('returns 404 when factura not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const res = await request(app)
        .get('/api/admin/aerotermia/facturas/FAC-001/descargar')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(404);
    });

    it('returns 404 when factura has no file', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ drive_file_id: null }] });
      const app = createApp();
      const res = await request(app)
        .get('/api/admin/aerotermia/facturas/FAC-001/descargar')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(404);
    });

    it('streams PDF when file exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ drive_file_id: 'drive-123' }] });
      mockGetPDFStream.mockResolvedValueOnce(Readable.from(['fake-pdf-content']));
      const app = createApp();
      const res = await request(app)
        .get('/api/admin/aerotermia/facturas/FAC-001/descargar')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment');
    });
  });
```

- [ ] **Step 2: Ejecutar tests y verificar que fallan**

Run: `cd api && npx vitest run src/__tests__/adminAerotermia.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar en `api/src/routes/adminAerotermia.ts`**

Añade el import de `getPDFStream`:

```ts
import { logger } from '../lib/logger';
import { getPDFStream } from '../lib/googleDrive';
```

En el `SELECT` de `GET /admin/aerotermia/facturas`, añade la línea `(f.drive_file_id IS NOT NULL) AS tiene_pdf` justo después de `f.fecha_factura_fin`:

```sql
        f.fecha_factura_inicio,
        f.fecha_factura_fin,
        (f.drive_file_id IS NOT NULL) AS tiene_pdf
      FROM facturas f
      ORDER BY f.fecha_factura_inicio DESC, f.piso ASC
```

Justo después del cierre del `router.get('/admin/aerotermia/facturas', ...)` (antes de `router.get('/admin/aerotermia/facturas/:id_factura', ...)`) añade:

```ts
router.get('/admin/aerotermia/facturas/:id_factura/descargar', authMiddleware, requireRole('directiva', 'admin'), async (req: Request, res: Response) => {
  try {
    const { id_factura } = req.params;

    const result = await query(
      'SELECT drive_file_id FROM facturas WHERE id_factura = $1',
      [id_factura]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Factura no encontrada' });
      return;
    }

    const factura = result.rows[0];
    if (!factura.drive_file_id) {
      res.status(404).json({ error: 'Esta factura no tiene archivo adjunto' });
      return;
    }

    const fileName = `factura-${id_factura}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    const stream = await getPDFStream(factura.drive_file_id);
    stream.pipe(res);
  } catch (err) {
    logger.error(err, 'Admin aerotermia factura download error');
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error al descargar el archivo' });
    }
  }
});
```

> **Importante:** este endpoint debe ir **antes** de `router.get('/admin/aerotermia/facturas/:id_factura', ...)` para que Express no capture `descargar` como si fuera un `:id_factura`. No hay conflicto real (rutas distintas), pero mantener este orden es más claro.

- [ ] **Step 4: Ejecutar tests y verificar que pasan**

Run: `cd api && npx vitest run src/__tests__/adminAerotermia.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck backend**

Run: `cd api && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add api/src/routes/adminAerotermia.ts api/src/__tests__/adminAerotermia.test.ts
git commit -m "feat: endpoint de descarga de factura en admin aerotermia"
```

---

## Task 3: Backend — registrar patrones en `normalizePath`

**Files:**
- Modify: `api/src/index.ts`

- [ ] **Step 1: Añadir los dos patrones**

En `api/src/index.ts`, dentro del array `normalizePath`, justo después de la línea de `/api/admin/aerotermia/facturas`, añade:

```ts
    [/^\/api\/admin\/aerotermia\/facturas\/[^/]+\/descargar$/, '/api/admin/aerotermia/facturas/:id_factura/descargar'],
    [/^\/api\/facturas\/[^/]+\/descargar$/, '/api/facturas/:id_factura/descargar'],
```

- [ ] **Step 2: Typecheck**

Run: `cd api && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add api/src/index.ts
git commit -m "chore: normalizar metricas de descarga de facturas"
```

---

## Task 4: Frontend — `downloadFacturaPDF` en `client.ts`

**Files:**
- Modify: `src/api/client.ts`

- [ ] **Step 1: Añadir la función**

En `src/api/client.ts`, justo después del cierre de `downloadJuntaPDF` (después de `URL.revokeObjectURL(url);` y `}`), añade:

```ts
export async function downloadFacturaPDF(
  idFactura: string,
  opts?: { admin?: boolean; piso?: string }
): Promise<void> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let endpoint: string;
  if (opts?.admin) {
    endpoint = `${API_URL}/admin/aerotermia/facturas/${encodeURIComponent(idFactura)}/descargar`;
  } else {
    const pisoQs = opts?.piso ? `?piso=${encodeURIComponent(opts.piso)}` : '';
    endpoint = `${API_URL}/facturas/${encodeURIComponent(idFactura)}/descargar${pisoQs}`;
  }

  const response = await fetch(endpoint, { headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${response.status}`);
  }
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  const filename = match ? match[1].replace(/['"]/g, '') : `factura-${idFactura}.pdf`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Build para verificar compilación**

Run: `npm run build`
Expected: compila sin errores (aún no hay consumidores, es export no usado).

- [ ] **Step 3: Commit**

```bash
git add src/api/client.ts
git commit -m "feat: cliente de descarga de facturas"
```

---

## Task 5: Frontend — fila "Descargar" en `FacturasTable`

**Files:**
- Modify: `src/components/FacturasTable.tsx`
- Test: `src/components/FacturasTable.test.tsx`

- [ ] **Step 1: Añadir test que falla**

Añade al inicio de `src/components/FacturasTable.test.tsx` el mock del cliente (justo después de los imports existentes):

```ts
vi.mock('../api/client', () => ({
  downloadFacturaPDF: vi.fn(),
}));

import { downloadFacturaPDF } from '../api/client';
```

> Necesitas importar `vi` desde vitest: cambia la primera línea a `import { describe, it, expect, vi } from 'vitest';`.

Añade estos dos tests al `describe('FacturasTable', ...)`:

```tsx
  it('shows download button only for facturas with tiene_pdf', () => {
    render(
      <FacturasTable
        data={[
          { id_factura: '1', periodo: '2026-01-01', importe_total: 80.5, importe_fijo: 20, kwh_calor: 100, kwh_frio: 30, kwh_acs: 50, m3_acs: 2.5, importe_calor: 40, importe_frio: 10, importe_variable_acs: 15, importe_acs: 30.5, tiene_pdf: true },
          { id_factura: '2', periodo: '2026-02-01', importe_total: 90, importe_fijo: 20, kwh_calor: 110, kwh_frio: 25, kwh_acs: 55, m3_acs: 2.8, importe_calor: 45, importe_frio: 8, importe_variable_acs: 18, importe_acs: 37 },
        ]}
      />
    );
    expect(screen.getByText('Descargar')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
  });

  it('calls downloadFacturaPDF when button clicked', async () => {
    render(
      <FacturasTable
        data={[
          { id_factura: '1', periodo: '2026-01-01', importe_total: 80.5, importe_fijo: 20, kwh_calor: 100, kwh_frio: 30, kwh_acs: 50, m3_acs: 2.5, importe_calor: 40, importe_frio: 10, importe_variable_acs: 15, importe_acs: 30.5, tiene_pdf: true },
        ]}
        downloadPiso="2A"
      />
    );
    const button = screen.getByRole('button');
    button.click();
    expect(downloadFacturaPDF).toHaveBeenCalledWith('1', { piso: '2A' });
  });
```

> Nota: el segundo test usa `button.click()` síncrono; la aserción sobre la llamada es síncrona porque `handleDownload` llama a `downloadFacturaPDF` dentro del handler antes de cualquier await. Si fallara por el estado de `downloading`, usa `await waitFor(...)`.

- [ ] **Step 2: Ejecutar tests y verificar que fallan**

Run: `npx vitest run src/components/FacturasTable.test.tsx`
Expected: FAIL — no existe la fila "Descargar".

- [ ] **Step 3: Implementar en `src/components/FacturasTable.tsx`**

Cambia los imports superiores a:

```tsx
import { Fragment, useMemo, useState } from 'react';
import { capitalizar } from '../lib/format';
import { downloadFacturaPDF } from '../api/client';
import Icon from './Icon';
```

Añade `tiene_pdf?: boolean;` al interface `Factura` (después de `importe_acs: number;`).

Cambia la firma del componente para añadir `downloadPiso` y el estado de descarga:

```tsx
export default function FacturasTable({ data, downloadPiso }: { data: Factura[]; downloadPiso?: string }) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (f: Factura) => {
    setDownloading(f.id_factura);
    try {
      await downloadFacturaPDF(f.id_factura, { piso: downloadPiso });
    } catch (err) {
      console.error('Error descargando factura:', err);
    } finally {
      setDownloading(null);
    }
  };
```

Justo después del `{rows.map((row) => (...))}` y antes del cierre de `</tbody>`, añade la fila de descarga:

```tsx
            <tr>
              <td className="sticky left-0 z-10 bg-cream py-1.5 pr-4 text-cocoa/60 text-[11px] border-t border-cocoa/8" style={{ minWidth: '100px' }}>
                Descargar
              </td>
              {chrono.map((f) => (
                <td key={f.id_factura} className="text-center py-1.5 px-3 border-t border-cocoa/8">
                  {f.tiene_pdf ? (
                    <button
                      onClick={() => handleDownload(f)}
                      disabled={downloading === f.id_factura}
                      className="btn btn-ghost text-xs"
                      title="Descargar factura"
                    >
                      <Icon name="download" size={12} />
                      {downloading === f.id_factura ? 'Descargando…' : 'Descargar'}
                    </button>
                  ) : (
                    <span className="text-cocoa/20 text-xs">—</span>
                  )}
                </td>
              ))}
            </tr>
```

- [ ] **Step 4: Ejecutar tests y verificar que pasan**

Run: `npx vitest run src/components/FacturasTable.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/FacturasTable.tsx src/components/FacturasTable.test.tsx
git commit -m "feat: fila de descarga en tabla de facturas"
```

---

## Task 6: Frontend — pasar `downloadPiso` desde `DashboardPage`

**Files:**
- Modify: `src/pages/DashboardPage.tsx`

- [ ] **Step 1: Añadir `tiene_pdf` a la interfaz y pasar la prop**

En `src/pages/DashboardPage.tsx`, añade `tiene_pdf?: boolean;` al interface `Factura` (después de `fecha_factura_fin?: string;`).

Cambia la línea `<FacturasTable data={filteredFacturas} />` por:

```tsx
          <FacturasTable data={filteredFacturas} downloadPiso={viewingAs ?? undefined} />
```

- [ ] **Step 2: Build + tests frontend**

Run: `npm run build`
Expected: compila sin errores.

Run: `npx vitest run src/pages 2>/dev/null || npm test`
Expected: PASS (no debe romper tests existentes).

- [ ] **Step 3: Commit**

```bash
git add src/pages/DashboardPage.tsx
git commit -m "feat: pasar piso de vista admin a la tabla de facturas"
```

---

## Task 7: Frontend — celda clicable en `AdminAerotermiaPage`

**Files:**
- Modify: `src/pages/AdminAerotermiaPage.tsx`
- Test: `src/__tests__/AdminAerotermiaPage.test.tsx`

- [ ] **Step 1: Añadir test que falla**

En `src/__tests__/AdminAerotermiaPage.test.tsx`, actualiza el mock existente de `../api/client` para incluir `downloadFacturaPDF`:

```ts
vi.mock('../api/client', () => ({
  apiFetch: vi.fn((url: string) => {
    if (url === '/admin/aerotermia/facturas') return Promise.resolve([]);
    if (url === '/admin/aerotermia/cop') return Promise.resolve([]);
    if (url.includes('/admin/aerotermia/consumos')) return Promise.resolve([]);
    if (url === '/admin/aerotermia/en-vivo') return Promise.resolve(null);
    return Promise.resolve([]);
  }),
  downloadFacturaPDF: vi.fn(),
}));

import { downloadFacturaPDF } from '../api/client';
```

Añade este test al `describe('AdminAerotermiaPage', ...)`:

```tsx
  it('descarga la factura al pulsar el total cuando tiene_pdf', async () => {
    vi.mocked(apiFetch).mockImplementation((url: string) => {
      if (url === '/admin/aerotermia/facturas') return Promise.resolve([
        { id_factura: 'F1', piso: '1A', periodo: recentPeriod(1), importe_total: 100, importe_fijo: 10, kwh_calor: 50, kwh_frio: 10, kwh_acs: 5, m3_acs: 1, importe_calor: 30, importe_frio: 5, importe_variable_acs: 2, importe_acs: 15, tiene_pdf: true },
      ]);
      if (url === '/admin/aerotermia/cop') return Promise.resolve([]);
      if (url.includes('/admin/aerotermia/consumos')) return Promise.resolve([]);
      if (url === '/admin/aerotermia/en-vivo') return Promise.resolve(null);
      return Promise.resolve([]);
    });
    render(<MemoryRouter><AdminAerotermiaPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('100,00 €')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('100,00 €'));
    expect(downloadFacturaPDF).toHaveBeenCalledWith('F1', { admin: true });
  });
```

- [ ] **Step 2: Ejecutar tests y verificar que fallan**

Run: `npx vitest run src/__tests__/AdminAerotermiaPage.test.tsx`
Expected: FAIL — la celda no es clicable / `downloadFacturaPDF` no se llama.

- [ ] **Step 3: Implementar en `src/pages/AdminAerotermiaPage.tsx`**

Añade el import del cliente (junto al existente `import { apiFetch } from '../api/client';`):

```tsx
import { apiFetch, downloadFacturaPDF } from '../api/client';
```

Añade `tiene_pdf?: boolean;` al interface `FacturaGlobal` (después de `fecha_factura_fin?: string;`).

Añade estado y handler dentro del componente (después de `const [searchVecino, setSearchVecino] = useState('');`):

```tsx
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (idFactura: string) => {
    setDownloading(idFactura);
    try {
      await downloadFacturaPDF(idFactura, { admin: true });
    } catch (err) {
      console.error('Error descargando factura:', err);
    } finally {
      setDownloading(null);
    }
  };
```

Sustituye el `facturasPivote` actual por esta versión que guarda `id_factura` y `tiene_pdf`:

```tsx
  interface PivotCell {
    importe: number;
    id_factura: string;
    tiene_pdf: boolean;
  }

  const facturasPivote = useMemo(() => {
    const map = new Map<string, Map<string, PivotCell>>();
    filteredFacturas.forEach((f) => {
      if (!map.has(f.piso)) map.set(f.piso, new Map());
      map.get(f.piso)!.set(f.periodo, {
        importe: Number(f.importe_total),
        id_factura: f.id_factura,
        tiene_pdf: !!f.tiene_pdf,
      });
    });
    return map;
  }, [filteredFacturas]);
```

Sustituye el bloque de renderizado de celdas del pivote (el `{periodosUnicos.map((periodo) => { const importe = ...; return (<td ...>...` ) por:

```tsx
                            {periodosUnicos.map((periodo) => {
                              const cell = facturasPivote.get(piso)?.get(periodo);
                              if (!cell) {
                                return (
                                  <td key={periodo} className="py-2 px-3 text-right font-mono font-num text-cocoa/40">—</td>
                                );
                              }
                              const importeStr = `${cell.importe.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
                              return (
                                <td key={periodo} className="py-2 px-3 text-right font-mono font-num text-cocoa/70">
                                  {cell.tiene_pdf ? (
                                    <button
                                      onClick={() => handleDownload(cell.id_factura)}
                                      disabled={downloading === cell.id_factura}
                                      className="underline decoration-dotted hover:text-accent transition-colors disabled:opacity-50"
                                      title="Descargar factura"
                                    >
                                      {downloading === cell.id_factura ? 'Descargando…' : importeStr}
                                    </button>
                                  ) : (
                                    importeStr
                                  )}
                                </td>
                              );
                            })}
```

- [ ] **Step 4: Ejecutar tests y verificar que pasan**

Run: `npx vitest run src/__tests__/AdminAerotermiaPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/AdminAerotermiaPage.tsx src/__tests__/AdminAerotermiaPage.test.tsx
git commit -m "feat: descarga de factura desde el pivote de admin aerotermia"
```

---

## Task 8: Verificación final

- [ ] **Step 1: Tests backend completos**

Run: `cd api && npm test`
Expected: todos PASS.

- [ ] **Step 2: Typecheck backend**

Run: `cd api && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Tests frontend completos**

Run: `npm test`
Expected: todos PASS.

- [ ] **Step 4: Build frontend**

Run: `npm run build`
Expected: compila sin errores.

- [ ] **Step 5: Revisar el diff final**

Run: `git status && git diff main...HEAD --stat`
Expected: solo los archivos listados en "File Structure".

- [ ] **Step 6: Push de la rama**

```bash
git push -u origin feat/descargar-facturas
```

---

## Self-Review

- **Spec coverage:** todos los requisitos de la spec tienen tarea: `tiene_pdf` en listados (T1/T2), endpoints de descarga vecino (T1) y admin (T2), normalizePath (T3), cliente (T4), fila "Descargar" (T5), prop `downloadPiso` (T6), pivote admin (T7), seguridad (piso ajeno → 404 en T1, `requireRole` en T2), `drive_file_id` no expuesto (solo booleano `tiene_pdf`).
- **Placeholder scan:** sin TBD/TODO; todo paso lleva código completo y comando con salida esperada.
- **Type consistency:** `tiene_pdf` (boolean opcional), `downloadFacturaPDF(idFactura, opts)`, `downloadPiso` coinciden entre client, FacturasTable, DashboardPage, AdminAerotermiaPage y tests.
