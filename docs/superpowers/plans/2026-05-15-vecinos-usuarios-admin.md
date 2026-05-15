# Vecinos + Usuarios + Admin Panel — Plan de Implementacion

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separar vecinos.email (facturas) de usuarios.email (login), CRUD completo de vecinos desde admin panel, y permitir usuarios sin piso.

**Architecture:** Expresiones condicionales `IF EXISTS` en migraciones para roles dev/prod. API ampliada con PUT/DELETE/POST para vecinos. Nuevo componente `EditVecinoModal` + refactor AdminPage para clarificar emails y acciones.

**Tech Stack:** Express + pg (backend), React + Zustand + Tailwind (frontend), Vitest + supertest (tests)

---

### Task 1: Migraciones dual-role (dev/prod)

**Files:**
- Modify: `api/migrations/002_create_readonly_user.sql`
- Modify: `api/migrations/003_email_tokens.sql`
- Modify: `api/migrations/004_vecinos_ownership.sql`

- [ ] **Step 1: Actualizar 002 con roles dev**

Cambia todos los GRANTs directos por bloques `DO $$ IF EXISTS` que cubran ambos entornos:

```sql
-- Crear usuario de solo lectura para la API del dashboard
-- El dashboard solo lee datos de las tablas gestionadas por n8n
-- y tiene control total sobre su propia tabla usuarios

-- Crear los roles (ajustar password en produccion)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dashboard_api') THEN
    CREATE ROLE dashboard_api WITH LOGIN PASSWORD 'change-this-password-in-production';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dashboard_api_dev') THEN
    CREATE ROLE dashboard_api_dev WITH LOGIN PASSWORD 'change-this-password-in-dev';
  END IF;
END
$$;

-- Permisos de solo lectura sobre tablas de n8n
GRANT CONNECT ON DATABASE elite TO dashboard_api;
GRANT CONNECT ON DATABASE elite TO dashboard_api_dev;
GRANT USAGE ON SCHEMA public TO dashboard_api;
GRANT USAGE ON SCHEMA public TO dashboard_api_dev;

-- Lectura sobre tablas n8n (datos de vecinos, contadores, facturas)
GRANT SELECT ON public.vecinos TO dashboard_api;
GRANT SELECT ON public.vecinos TO dashboard_api_dev;
GRANT SELECT ON public.contadores TO dashboard_api;
GRANT SELECT ON public.contadores TO dashboard_api_dev;
GRANT SELECT ON public.facturas TO dashboard_api;
GRANT SELECT ON public.facturas TO dashboard_api_dev;

-- La tabla usuarios es gestionada por el dashboard (migraciones, inserciones)
ALTER TABLE IF EXISTS public.usuarios OWNER TO dashboard_api;
GRANT ALL PRIVILEGES ON TABLE public.usuarios TO dashboard_api;
GRANT ALL PRIVILEGES ON TABLE public.usuarios TO dashboard_api_dev;
GRANT USAGE, SELECT ON SEQUENCE public.usuarios_id_seq TO dashboard_api;
GRANT USAGE, SELECT ON SEQUENCE public.usuarios_id_seq TO dashboard_api_dev;

-- El dashboard necesita actualizar el email de vecinos para enviar invitaciones
GRANT UPDATE (email) ON public.vecinos TO dashboard_api;
GRANT UPDATE (email) ON public.vecinos TO dashboard_api_dev;

-- Permisos por defecto para futuras tablas que cree dashboard_api
ALTER DEFAULT PRIVILEGES FOR ROLE dashboard_api IN SCHEMA public
  GRANT ALL PRIVILEGES ON TABLES TO dashboard_api;
ALTER DEFAULT PRIVILEGES FOR ROLE dashboard_api IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO dashboard_api;
ALTER DEFAULT PRIVILEGES FOR ROLE dashboard_api_dev IN SCHEMA public
  GRANT ALL PRIVILEGES ON TABLES TO dashboard_api_dev;
ALTER DEFAULT PRIVILEGES FOR ROLE dashboard_api_dev IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO dashboard_api_dev;
```

- [ ] **Step 2: Actualizar 003 con roles dev**

Añade GRANTs para `dashboard_api_dev`:

```sql
CREATE TABLE IF NOT EXISTS email_tokens (
  id SERIAL PRIMARY KEY,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  piso VARCHAR(255),
  type VARCHAR(20) NOT NULL CHECK (type IN ('invite', 'reset')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_tokens_type_email ON email_tokens(type, email);
CREATE INDEX IF NOT EXISTS idx_email_tokens_type_piso ON email_tokens(type, piso);

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dashboard_api') THEN
    GRANT ALL PRIVILEGES ON TABLE public.email_tokens TO dashboard_api;
    GRANT USAGE, SELECT ON SEQUENCE public.email_tokens_id_seq TO dashboard_api;
  END IF;
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dashboard_api_dev') THEN
    GRANT ALL PRIVILEGES ON TABLE public.email_tokens TO dashboard_api_dev;
    GRANT USAGE, SELECT ON SEQUENCE public.email_tokens_id_seq TO dashboard_api_dev;
  END IF;
END
$$;
```

- [ ] **Step 3: Actualizar 004 con roles dev**

```sql
-- Transferir propiedad de vecinos al dashboard
-- El dashboard es responsable de vecinos; n8nuser solo lee
ALTER TABLE IF EXISTS public.vecinos OWNER TO dashboard_api;

-- Dar permiso de solo lectura a n8nuser y n8nuser_dev
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'n8nuser') THEN
    GRANT SELECT ON public.vecinos TO n8nuser;
  END IF;
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'n8nuser_dev') THEN
    GRANT SELECT ON public.vecinos TO n8nuser_dev;
  END IF;
END
$$;
```

- [ ] **Step 4: Commit**

```bash
git add api/migrations/
git commit -m "fix: soporte dual-role (dev/prod) en migraciones con IF EXISTS"
```

---

### Task 2: API — Ampliar PUT /admin/vecinos/:piso

**Files:**
- Modify: `api/src/routes/admin.ts:28-49`

- [ ] **Step 1: Escribir el test que falla**

En `api/src/__tests__/routes.test.ts`, busca la seccion `Admin routes` (linea ~585) y añade after los tests existentes de admin:

```typescript
  describe('PUT /api/admin/vecinos/:piso', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it('returns 403 for non-admin user', async () => {
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/vecinos/1A')
        .set('Authorization', `Bearer ${userToken(false)}`)
        .send({ nombre: 'Nuevo nombre' });
      expect(res.status).toBe(403);
    });

    it('returns 400 when no fields provided', async () => {
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/vecinos/1A')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/campo/);
    });

    it('updates vecino nombre for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ piso: '1A', nombre: 'Nuevo nombre', email: 'v@e.com' }] });
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/vecinos/1A')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ nombre: 'Nuevo nombre' });
      expect(res.status).toBe(200);
      expect(res.body.nombre).toBe('Nuevo nombre');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE vecinos'),
        expect.arrayContaining(['Nuevo nombre', '1A'])
      );
    });

    it('updates vecino email for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ piso: '1A', nombre: 'V1', email: 'new@email.com' }] });
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/vecinos/1A')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ email: 'new@email.com' });
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('new@email.com');
    });

    it('updates vecino coeficiente for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ piso: '1A', nombre: 'V1', email: 'v@e.com', coeficiente: '0.30' }] });
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/vecinos/1A')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ coeficiente: '0.30' });
      expect(res.status).toBe(200);
    });

    it('updates vecino enviar_email for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ piso: '1A', nombre: 'V1', email: 'v@e.com', enviar_email: true }] });
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/vecinos/1A')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ enviar_email: true });
      expect(res.status).toBe(200);
    });

    it('updates vecino device_identification for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ piso: '1A', nombre: 'V1', email: 'v@e.com', device_identification: 'DEVID99' }] });
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/vecinos/1A')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ device_identification: 'DEVID99' });
      expect(res.status).toBe(200);
    });

    it('updates vecino serial_number for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ piso: '1A', nombre: 'V1', email: 'v@e.com', serial_number: '1234' }] });
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/vecinos/1A')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ serial_number: '1234' });
      expect(res.status).toBe(200);
    });

    it('returns 404 when vecino not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const res = await request(app)
        .put('/api/admin/vecinos/99Z')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ nombre: 'X' });
      expect(res.status).toBe(404);
    });
  });
```

- [ ] **Step 2: Ejecutar tests y verificar que fallan**

```bash
cd api && npx vitest run --reporter=verbose 2>&1 | tail -30
```
Expected: FAIL — los nuevos tests devuelven 400 porque `email` es requerido en el codigo actual.

- [ ] **Step 3: Reescribir PUT /admin/vecinos/:piso**

Reemplaza la ruta existente en `api/src/routes/admin.ts` (lineas 28-49):

```typescript
router.put('/admin/vecinos/:piso', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { piso } = req.params;
    const allowedFields = ['nombre', 'email', 'coeficiente', 'enviar_email', 'device_identification', 'serial_number'];
    const updates: string[] = [];
    const values: unknown[] = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${values.length + 1}`);
        values.push(req.body[field]);
      }
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'Al menos un campo para actualizar es requerido' });
      return;
    }

    values.push(piso);
    const result = await query(
      `UPDATE vecinos SET ${updates.join(', ')} WHERE piso = $${values.length} RETURNING piso, nombre, email, coeficiente, enviar_email, device_identification, serial_number`,
      values
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Vecino no encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    logger.error(err, 'Admin update vecino error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
```

- [ ] **Step 4: Ejecutar tests y verificar que pasan**

```bash
cd api && npx vitest run --reporter=verbose 2>&1 | tail -20
```
Expected: PASS — todos los tests verdes.

- [ ] **Step 5: Commit**

```bash
git add api/src/routes/admin.ts api/src/__tests__/routes.test.ts
git commit -m "feat: ampliar PUT /admin/vecinos/:piso para aceptar todos los campos"
```

---

### Task 3: API — POST /admin/vecinos (nuevo)

**Files:**
- Modify: `api/src/routes/admin.ts`
- Modify: `api/src/__tests__/routes.test.ts`

- [ ] **Step 1: Escribir tests**

Añade en la seccion `Admin routes` del test:

```typescript
  describe('POST /api/admin/vecinos', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it('returns 403 for non-admin user', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/admin/vecinos')
        .set('Authorization', `Bearer ${userToken(false)}`)
        .send({ piso: '7A', nombre: 'Vecino 7A' });
      expect(res.status).toBe(403);
    });

    it('returns 400 when piso is missing', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/admin/vecinos')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ nombre: 'Sin piso' });
      expect(res.status).toBe(400);
    });

    it('creates vecino for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ piso: '7A', nombre: 'Vecino 7A', email: null }] });
      const app = createApp();
      const res = await request(app)
        .post('/api/admin/vecinos')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ piso: '7A', nombre: 'Vecino 7A', email: 'vecino7a@elite.com' });
      expect(res.status).toBe(201);
      expect(res.body.piso).toBe('7A');
    });

    it('returns 409 when piso already exists', async () => {
      const err = new Error('duplicate') as any;
      err.code = '23505';
      mockQuery.mockRejectedValueOnce(err);
      const app = createApp();
      const res = await request(app)
        .post('/api/admin/vecinos')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ piso: '1A', nombre: 'Duplicado' });
      expect(res.status).toBe(409);
    });
  });
```

- [ ] **Step 2: Ejecutar tests y verificar que fallan**

```bash
cd api && npx vitest run --reporter=verbose 2>&1 | tail -10
```
Expected: FAIL — 404 porque la ruta no existe.

- [ ] **Step 3: Implementar POST /admin/vecinos**

Añade despues del PUT existente en `api/src/routes/admin.ts`:

```typescript
router.post('/admin/vecinos', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { piso, nombre, email, coeficiente, enviar_email, device_identification, serial_number } = req.body;
    if (!piso) {
      res.status(400).json({ error: 'Piso requerido' });
      return;
    }
    const result = await query(
      `INSERT INTO vecinos (piso, nombre, email, coeficiente, enviar_email, device_identification, serial_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING piso, nombre, email, coeficiente, enviar_email, device_identification, serial_number`,
      [piso, nombre || null, email || null, coeficiente || null, enviar_email || false, device_identification || null, serial_number || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'El piso ya existe' });
      return;
    }
    logger.error(err, 'Admin create vecino error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
```

- [ ] **Step 4: Ejecutar tests y verificar que pasan**

```bash
cd api && npx vitest run --reporter=verbose 2>&1 | tail -20
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/routes/admin.ts api/src/__tests__/routes.test.ts
git commit -m "feat: añadir POST /admin/vecinos para crear vecinos desde admin"
```

---

### Task 4: API — DELETE /admin/vecinos/:piso (nuevo)

**Files:**
- Modify: `api/src/routes/admin.ts`
- Modify: `api/src/__tests__/routes.test.ts`

- [ ] **Step 1: Escribir tests**

```typescript
  describe('DELETE /api/admin/vecinos/:piso', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it('returns 403 for non-admin user', async () => {
      const app = createApp();
      const res = await request(app)
        .delete('/api/admin/vecinos/1A')
        .set('Authorization', `Bearer ${userToken(false)}`);
      expect(res.status).toBe(403);
    });

    it('deletes vecino for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ piso: '7A' }] });
      const app = createApp();
      const res = await request(app)
        .delete('/api/admin/vecinos/7A')
        .set('Authorization', `Bearer ${userToken(true)}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/eliminado/);
    });

    it('returns 404 when vecino not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const res = await request(app)
        .delete('/api/admin/vecinos/99Z')
        .set('Authorization', `Bearer ${userToken(true)}`);
      expect(res.status).toBe(404);
    });

    it('sets usuario.vecino_piso to NULL when vecino is deleted', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ piso: '7A' }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const res = await request(app)
        .delete('/api/admin/vecinos/7A')
        .set('Authorization', `Bearer ${userToken(true)}`);
      expect(res.status).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE usuarios SET vecino_piso = NULL'),
        ['7A']
      );
    });
  });
```

- [ ] **Step 2: Ejecutar tests y verificar que fallan**

```bash
cd api && npx vitest run --reporter=verbose 2>&1 | tail -10
```
Expected: FAIL — 404 porque la ruta no existe.

- [ ] **Step 3: Implementar DELETE /admin/vecinos/:piso**

```typescript
router.delete('/admin/vecinos/:piso', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { piso } = req.params;

    await query('UPDATE usuarios SET vecino_piso = NULL WHERE vecino_piso = $1', [piso]);

    const result = await query(
      'DELETE FROM vecinos WHERE piso = $1 RETURNING piso',
      [piso]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Vecino no encontrado' });
      return;
    }

    res.json({ message: 'Vecino eliminado correctamente' });
  } catch (err) {
    logger.error(err, 'Admin delete vecino error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
```

- [ ] **Step 4: Ejecutar tests y verificar que pasan**

```bash
cd api && npx vitest run --reporter=verbose 2>&1 | tail -20
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/routes/admin.ts api/src/__tests__/routes.test.ts
git commit -m "feat: añadir DELETE /admin/vecinos/:piso con desvinculacion de usuarios"
```

---

### Task 5: API — vecino_piso opcional en POST /admin/usuarios

**Files:**
- Modify: `api/src/routes/admin.ts:112-145`
- Modify: `api/src/__tests__/routes.test.ts`

- [ ] **Step 1: Escribir tests**

Añade en la seccion `POST /api/admin/usuarios`:

```typescript
    it('creates user without vecino_piso (global user)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ piso: '1A' }] }); // vecino exists check skip
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 10, vecino_piso: null, email: 'gestor@elite.com', is_admin: true, created_at: new Date().toISOString() }] });
      const app = createApp();
      const res = await request(app)
        .post('/api/admin/usuarios')
        .set('Authorization', `Bearer ${userToken(true)}`)
        .send({ email: 'gestor@elite.com', password: 'password123' });
      expect(res.status).toBe(201);
      expect(res.body.vecino_piso).toBeNull();
    });
```

- [ ] **Step 2: Ejecutar test y verificar que falla**

```bash
cd api && npx vitest run --reporter=verbose -t "creates user without" 2>&1
```
Expected: FAIL — 400 porque `vecino_piso` es requerido.

- [ ] **Step 3: Hacer vecino_piso opcional**

En `api/src/routes/admin.ts`, cambia la validacion del POST (linea 116-119):

```typescript
    if (!email || !password) {
      res.status(400).json({ error: 'email y password son requeridos' });
      return;
    }

    if (vecino_piso) {
      const vecino = await query('SELECT piso FROM vecinos WHERE piso = $1', [vecino_piso]);
      if (vecino.rows.length === 0) {
        res.status(400).json({ error: 'El piso indicado no existe en el edificio' });
        return;
      }
    }
```

- [ ] **Step 4: Ejecutar tests y verificar que pasan**

```bash
cd api && npx vitest run --reporter=verbose 2>&1 | tail -20
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/routes/admin.ts api/src/__tests__/routes.test.ts
git commit -m "feat: permitir vecino_piso opcional en POST /admin/usuarios"
```

---

### Task 6: Frontend — EditVecinoModal (nuevo componente)

**Files:**
- Create: `src/components/EditVecinoModal.tsx`
- Modify: `src/pages/AdminPage.tsx`

- [ ] **Step 1: Crear el componente EditVecinoModal**

```typescript
import { useState, FormEvent } from 'react';
import Icon from './Icon';
import { apiFetch } from '../api/client';

interface VecinoData {
  piso: string;
  nombre: string | null;
  email: string | null;
  coeficiente: string | null;
  enviar_email: boolean;
  device_identification: string | null;
  serial_number: string | null;
}

interface Props {
  vecino: VecinoData;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditVecinoModal({ vecino, onClose, onSaved }: Props) {
  const [nombre, setNombre] = useState(vecino.nombre || '');
  const [email, setEmail] = useState(vecino.email || '');
  const [coeficiente, setCoeficiente] = useState(vecino.coeficiente || '');
  const [enviarEmail, setEnviarEmail] = useState(vecino.enviar_email);
  const [deviceId, setDeviceId] = useState(vecino.device_identification || '');
  const [serialNumber, setSerialNumber] = useState(vecino.serial_number || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await apiFetch(`/admin/vecinos/${vecino.piso}`, {
        method: 'PUT',
        body: JSON.stringify({
          nombre: nombre || null,
          email: email || null,
          coeficiente: coeficiente || null,
          enviar_email: enviarEmail,
          device_identification: deviceId || null,
          serial_number: serialNumber || null,
        }),
      });
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar vecino');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(58,47,36,0.3)', backdropFilter: 'blur(4px)' }}>
      <div className="glass p-[26px] w-full max-w-[480px] animate-[fadeUp_250ms_ease-out]">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-2)' }}>
              <Icon name="users" size={14} className="text-cream" />
            </div>
            <span className="eyebrow">Editar vecino</span>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-2 text-cocoa/40 hover:text-cocoa">
            <Icon name="x" size={16} />
          </button>
        </div>

        <p className="text-sm text-cocoa/60 mb-4">Piso {vecino.piso}</p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(163,64,42,.08)', color: '#a3402a' }}>
            <Icon name="alertTriangle" size={14} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Nombre</label>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="input-card" placeholder="Nombre del vecino" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Email facturas</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-card" placeholder="Email para facturas" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Coeficiente</label>
            <input type="text" value={coeficiente} onChange={(e) => setCoeficiente(e.target.value)} className="input-card" placeholder="0.20" />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="enviarEmailVecino" checked={enviarEmail} onChange={(e) => setEnviarEmail(e.target.checked)} className="w-4 h-4 rounded accent-[var(--accent)]" />
            <label htmlFor="enviarEmailVecino" className="text-sm text-cocoa/70 cursor-pointer select-none">Enviar facturas por email</label>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Device Identification</label>
            <input type="text" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} className="input-card" placeholder="DEVID001" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Serial Number</label>
            <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className="input-card" placeholder="10000001" />
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              <Icon name="check" size={14} />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar que compila**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/components/EditVecinoModal.tsx
git commit -m "feat: añadir EditVecinoModal para editar todos los campos de vecinos"
```

---

### Task 7: Frontend — Refactor AdminPage (tabla, emails, acciones)

**Files:**
- Modify: `src/pages/AdminPage.tsx`

- [ ] **Step 1: Actualizar la interfaz Vecino**

En `AdminPage.tsx`, cambia la interfaz:

```typescript
interface Vecino {
  piso: string;
  nombre: string;
  user_id: number | null;
  email: string | null;
  vecino_email: string | null;
  is_admin: boolean;
  coeficiente: string | null;
  enviar_email: boolean;
  device_identification: string | null;
  serial_number: string | null;
}
```

- [ ] **Step 2: Añadir la query de GET /admin/vecinos para incluir nuevos campos**

En `api/src/routes/admin.ts`, actualiza la query del GET (linea 15-20):

```typescript
    const result = await query(`
      SELECT v.piso, v.nombre, u.id as user_id, u.email, v.email as vecino_email, u.is_admin,
             v.coeficiente, v.enviar_email, v.device_identification, v.serial_number
      FROM vecinos v
      LEFT JOIN usuarios u ON u.vecino_piso = v.piso
      ORDER BY v.piso
    `);
```

- [ ] **Step 3: Añadir estado para el modal de editar vecino**

Añade debajo de `deletingVecino`:

```typescript
  const [editingVecinoData, setEditingVecinoData] = useState<Vecino | null>(null);
```

- [ ] **Step 4: Refactorizar cabeceras de la tabla**

Cambia las cabeceras (lineas 303-310):

```tsx
                <thead>
                  <tr>
                    <th>Piso</th>
                    <th>Nombre</th>
                    <th>Email login</th>
                    <th>Rol</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
```

- [ ] **Step 5: Refactorizar la columna de acciones**

Reemplaza la columna `td` de acciones (lineas 329-396):

```tsx
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          {/* Editar vecino (todos los campos) */}
                          <button
                            onClick={() => setEditingVecinoData(v)}
                            className="btn btn-ghost p-2 text-cocoa/40 hover:text-accent-2"
                            title="Editar vecino"
                          >
                            <Icon name="users" size={15} />
                          </button>

                          {/* Email facturas: editar inline o invitar */}
                          {v.vecino_email ? (
                            <button
                              onClick={() => handleInvite(v.piso)}
                              className="btn btn-ghost p-2 text-accent hover:text-accent/80"
                              title="Enviar invitacion"
                            >
                              <Icon name="mail" size={15} />
                            </button>
                          ) : (
                            editingVecinoEmail === v.piso ? (
                              <span className="flex items-center gap-1">
                                <input
                                  type="email"
                                  value={editingVecinoEmailValue}
                                  onChange={(e) => setEditingVecinoEmailValue(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveVecinoEmail(); if (e.key === 'Escape') setEditingVecinoEmail(null); }}
                                  className="input-card text-xs py-0.5 px-1.5 w-32"
                                  placeholder="email facturas..."
                                  autoFocus
                                />
                                <button onClick={handleSaveVecinoEmail} className="btn btn-ghost p-1 text-sage" title="Guardar"><Icon name="check" size={12} /></button>
                                <button onClick={() => setEditingVecinoEmail(null)} className="btn btn-ghost p-1 text-rise" title="Cancelar"><Icon name="x" size={12} /></button>
                              </span>
                            ) : (
                              <button
                                onClick={() => { setEditingVecinoEmail(v.piso); setEditingVecinoEmailValue(''); }}
                                className="btn btn-ghost p-2 text-cocoa/40 hover:text-accent"
                                title="Asignar email facturas"
                              >
                                <Icon name="mail" size={15} />
                              </button>
                            )
                          )}

                          {/* Acciones de usuario (si tiene user_id) */}
                          {v.user_id ? (
                            <>
                              <button
                                onClick={() => setEditingVecino(v)}
                                className="btn btn-ghost p-2 text-cocoa/40 hover:text-cocoa"
                                title="Editar usuario"
                              >
                                <Icon name="edit" size={15} />
                              </button>
                              <button
                                onClick={() => setChangingPassword(v)}
                                className="btn btn-ghost p-2 text-cocoa/40 hover:text-cocoa"
                                title="Cambiar contrasena"
                              >
                                <Icon name="key" size={15} />
                              </button>
                              {v.user_id !== user?.id && (
                                <button
                                  onClick={() => setDeletingVecino(v)}
                                  className="btn btn-ghost p-2 text-cocoa/40 hover:text-red-600"
                                  title="Eliminar usuario"
                                >
                                  <Icon name="trash" size={15} />
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-[11px] text-cocoa/25 w-[72px] text-center">—</span>
                          )}
                        </div>
                      </td>
```

- [ ] **Step 6: Hacer vecino_piso opcional en el formulario "Crear acceso"**

Cambia el select (lineas 225-241), quita `required` y permite opcion vacia:

```tsx
                  <select
                    id="vecinoPiso"
                    value={vecinoPiso}
                    onChange={(e) => setVecinoPiso(e.target.value)}
                    className="input-card"
                  >
                    <option value="">Sin piso (usuario global)...</option>
                    {vecinos
                      .filter((v) => !v.email)
                      .map((v) => (
                        <option key={v.piso} value={v.piso}>
                          {v.piso} — {v.nombre}
                        </option>
                      ))}
                  </select>
```

Y en `handleCreateUser`, quita `vecino_piso` de la validacion:

```typescript
    try {
      const body: Record<string, string> = { email, password };
      if (vecinoPiso) body.vecino_piso = vecinoPiso;
      await apiFetch('/admin/usuarios', {
        method: 'POST',
        body: JSON.stringify(body),
      });
```

- [ ] **Step 7: Añadir el EditVecinoModal al render**

Añade antes del `</div>` final (linea 444):

```tsx
      {editingVecinoData && (
        <EditVecinoModal
          vecino={{
            piso: editingVecinoData.piso,
            nombre: editingVecinoData.nombre,
            email: editingVecinoData.vecino_email,
            coeficiente: editingVecinoData.coeficiente,
            enviar_email: editingVecinoData.enviar_email || false,
            device_identification: editingVecinoData.device_identification,
            serial_number: editingVecinoData.serial_number,
          }}
          onClose={() => setEditingVecinoData(null)}
          onSaved={() => {
            setEditingVecinoData(null);
            apiFetch<Vecino[]>('/admin/vecinos').then(setVecinos).catch(console.error);
          }}
        />
      )}
```

- [ ] **Step 8: Añadir import de EditVecinoModal**

Añade debajo de los imports existentes:

```typescript
import EditVecinoModal from '../components/EditVecinoModal';
```

- [ ] **Step 9: Verificar compilacion**

```bash
npm run build 2>&1 | tail -15
```
Expected: BUILD SUCCESS.

- [ ] **Step 10: Commit**

```bash
git add src/pages/AdminPage.tsx api/src/routes/admin.ts
git commit -m "feat: refactor AdminPage con emails claros, editar vecinos, y usuarios sin piso"
```

---

### Task 8: Frontend tests

**Files:**
- Create: `src/pages/AdminPage.test.tsx`

- [ ] **Step 1: Crear AdminPage.test.tsx**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminPage from './AdminPage';

vi.mock('../store/auth', () => ({
  useAuthStore: vi.fn((selector: string) => {
    const state = {
      user: { id: 1, vecinoPiso: '1A', email: 'admin@elite.com', isAdmin: true },
    };
    if (selector === 'user') return state.user;
    return selector ? selector(state) : state;
  }),
}));

vi.mock('../api/client', () => ({
  apiFetch: vi.fn().mockResolvedValue([
    {
      piso: '1A',
      nombre: 'Vecino 1A',
      user_id: 1,
      email: 'admin@elite.com',
      vecino_email: 'vecino1a@elite.com',
      is_admin: true,
      coeficiente: '0.20',
      enviar_email: false,
      device_identification: 'DEVID001',
      serial_number: '10000001',
    },
    {
      piso: '2A',
      nombre: 'Vecino 2A',
      user_id: null,
      email: null,
      vecino_email: null,
      is_admin: false,
      coeficiente: '0.20',
      enviar_email: false,
      device_identification: 'DEVID002',
      serial_number: '10000002',
    },
  ]),
}));

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders admin panel heading', async () => {
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    expect(await screen.findByText('Vecinos')).toBeInTheDocument();
    expect(screen.getByText('Panel de administracion')).toBeInTheDocument();
  });

  it('shows login email column', async () => {
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    expect(await screen.findByText('Email login')).toBeInTheDocument();
  });

  it('shows stats after loading', async () => {
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    expect(await screen.findByText('Vecinos')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows vecino rows', async () => {
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    expect(await screen.findByText('1A')).toBeInTheDocument();
    expect(screen.getByText('Vecino 1A')).toBeInTheDocument();
    expect(screen.getByText('admin@elite.com')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Ejecutar tests del frontend**

```bash
npm test 2>&1 | tail -20
```
Expected: ALL PASS.

- [ ] **Step 3: Ejecutar tests del backend**

```bash
cd api && npm test 2>&1 | tail -20
```
Expected: ALL PASS.

- [ ] **Step 4: Commit**

```bash
git add src/pages/AdminPage.test.tsx
git commit -m "test: añadir tests de AdminPage con nuevos campos"
```

---

### Task 9: Verificacion final

- [ ] **Step 1: Verificar frontend compila**

```bash
npm run build
```
Expected: BUILD SUCCESS.

- [ ] **Step 2: Verificar backend compila**

```bash
cd api && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Ejecutar todos los tests**

```bash
npm test && cd api && npm test
```
Expected: ALL PASS.

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "chore: verificacion final de build y tests"
```
