# Invitar usuarios con popup + múltiples usuarios por vivienda

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar formulario inline de "Crear acceso" por popup modal, permitir múltiples usuarios por piso, y eliminar password del flujo de creación (solo invitación por email).

**Architecture:** Se transforma `POST /admin/usuarios` de creador de usuarios a endpoint de invitación. Se quita la constraint UNIQUE de `usuarios.vecino_piso`. Se crea `InviteUserModal` copiando el patrón de `ChangePasswordModal`. Los endpoints `/admin/invitar` y `/auth/register` dejan de bloquear cuando ya existe un usuario para el mismo piso.

**Tech Stack:** Express + TypeScript (backend), React + TypeScript + Tailwind (frontend), PostgreSQL, Vitest + Supertest

---

### Task 1: Migración DB — permitir múltiples usuarios por piso

**Files:**
- Create: `api/migrations/007_multi_usuario_por_piso.sql`

- [ ] **Step 1: Crear archivo de migración**

```sql
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_vecino_piso_key;
```

- [ ] **Step 2: Commit**

```bash
git add api/migrations/007_multi_usuario_por_piso.sql
git commit -m "feat: permitir multiples usuarios por vivienda"
```

---

### Task 2: Backend — sendInviteEmail con piso opcional

**Files:**
- Modify: `api/src/lib/email.ts:63-81`

- [ ] **Step 1: Hacer piso parámetro opcional en la firma**

```ts
export async function sendInviteEmail(to: string, piso: string | null, token: string) {
```

- [ ] **Step 2: Adaptar el texto del email para manejar piso nulo**

Cambiar el texto plano (línea 74) y el HTML (líneas 75-76).

Texto plano — cambiar:
```
Hola vecino del piso ${piso},\n\nHas sido invitado...
```
Por:
```ts
const saludo = piso ? `Hola vecino del piso ${piso},\n\n` : 'Hola,\n\n';
```
y usar `saludo` en la template literal.

HTML — cambiar:
```html
<p>Hola vecino del piso <strong>${piso}</strong>,</p>
```
Por:
```ts
const saludoHtml = piso ? `<p>Hola vecino del piso <strong>${piso}</strong>,</p>` : '<p>Hola,</p>';
```
y usar `saludoHtml` en `wrapHtml`.

- [ ] **Step 3: Verificar compilación**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add api/src/lib/email.ts
git commit -m "feat: sendInviteEmail acepta piso opcional"
```

---

### Task 3: Backend — transformar POST /admin/usuarios a endpoint de invitación

**Files:**
- Modify: `api/src/routes/admin.ts:174-209`

- [ ] **Step 1: Reemplazar el handler completo**

Cambiar el bloque `router.post('/admin/usuarios', ...)` actual por:

```ts
router.post('/admin/usuarios', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { email, vecino_piso } = req.body;

    if (!email) {
      res.status(400).json({ error: 'email es requerido' });
      return;
    }

    if (vecino_piso) {
      const vecino = await query('SELECT piso FROM vecinos WHERE piso = $1', [vecino_piso]);
      if (vecino.rows.length === 0) {
        res.status(400).json({ error: 'El piso indicado no existe en el edificio' });
        return;
      }
    }

    const token = await createEmailToken(email, 'invite', vecino_piso || undefined);
    await sendInviteEmail(email, vecino_piso || null, token);
    res.json({ message: 'Invitacion enviada correctamente' });
  } catch (err) {
    logger.error(err, 'Admin invite user error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
```

- [ ] **Step 2: Eliminar import de bcrypt si ya no se usa en este archivo**

Verificar si `bcrypt` se usa en otra parte de `admin.ts`. Lo usa en `PUT /admin/usuarios/:id/password` (cambio de contraseña de usuario). Así que se mantiene el import.

- [ ] **Step 3: Verificar compilación**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add api/src/routes/admin.ts
git commit -m "feat: POST /admin/usuarios ahora envia invitacion por email en vez de crear usuario con password"
```

---

### Task 4: Backend — quitar bloqueo de usuario existente en POST /admin/invitar

**Files:**
- Modify: `api/src/routes/admin.ts:347-351`

- [ ] **Step 1: Eliminar el check existingUser**

Quitar las líneas:
```ts
    const existingUser = await query('SELECT id FROM usuarios WHERE vecino_piso = $1', [piso]);
    if (existingUser.rows.length > 0) {
      res.status(409).json({ error: 'Este piso ya tiene un usuario registrado' });
      return;
    }
```

Dejar el endpoint así:
```ts
router.post('/admin/invitar', authMiddleware, adminMiddleware, rateLimit(100, 60 * 60 * 1000), async (req: Request, res: Response) => {
  try {
    const { piso } = req.body;
    if (!piso) {
      res.status(400).json({ error: 'Piso requerido' });
      return;
    }
    const vecinoResult = await query('SELECT piso, email FROM vecinos WHERE piso = $1', [piso]);
    if (vecinoResult.rows.length === 0) {
      res.status(400).json({ error: 'El piso indicado no existe' });
      return;
    }
    const vecino = vecinoResult.rows[0];
    if (!vecino.email) {
      res.status(400).json({ error: 'El vecino no tiene email registrado' });
      return;
    }
    const token = await createEmailToken(vecino.email, 'invite', vecino.piso);
    await sendInviteEmail(vecino.email, vecino.piso, token);
    res.json({ message: 'Invitacion enviada correctamente' });
  } catch (err) {
    logger.error(err, 'Admin invite error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
```

- [ ] **Step 2: Verificar compilación**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add api/src/routes/admin.ts
git commit -m "fix: permitir invitar aunque ya exista usuario para ese piso"
```

---

### Task 5: Backend — quitar bloqueo de usuario existente en POST /auth/register

**Files:**
- Modify: `api/src/routes/auth.ts:192-196`

- [ ] **Step 1: Eliminar el check existing**

Quitar las líneas:
```ts
    const existing = await query('SELECT id FROM usuarios WHERE vecino_piso = $1', [tokenData.piso]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Ya existe un usuario para este piso' });
      return;
    }
```

- [ ] **Step 2: Verificar compilación**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add api/src/routes/auth.ts
git commit -m "fix: permitir registrar aunque ya exista usuario para ese piso"
```

---

### Task 6: Frontend — añadir inviteUser al API client

**Files:**
- Modify: `src/api/client.ts`

- [ ] **Step 1: Añadir función inviteUser**

Después de `changeOwnPassword` (línea 54), añadir:

```ts
export async function inviteUser(email: string, vecinoPiso?: string) {
  return apiFetch<{ message: string }>('/admin/usuarios', {
    method: 'POST',
    body: JSON.stringify({ email, vecino_piso: vecinoPiso || undefined }),
  });
}
```

- [ ] **Step 2: Verificar compilación**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/api/client.ts
git commit -m "feat: añadir inviteUser al API client"
```

---

### Task 7: Frontend — crear InviteUserModal

**Files:**
- Create: `src/components/InviteUserModal.tsx`

- [ ] **Step 1: Leer ChangePasswordModal como referencia**

Ya lo tenemos leído. El patrón es:
- `createPortal` a `document.body`
- `modal-backdrop` con `onClick` para cerrar
- `modal-panel` con `stopPropagation`
- Escape para cerrar
- Estados: loading, error, success
- Botones Cancelar / Enviar

- [ ] **Step 2: Crear el componente**

```tsx
import { useState, useEffect, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { inviteUser, apiFetch } from '../api/client';

interface VecinoOption {
  piso: string;
}

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export default function InviteUserModal({ onClose, onSaved }: Props) {
  const [email, setEmail] = useState('');
  const [vecinoPiso, setVecinoPiso] = useState('');
  const [vecinos, setVecinos] = useState<VecinoOption[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    apiFetch<VecinoOption[]>('/admin/vecinos')
      .then(setVecinos)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        onSaved();
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [success, onSaved, onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('El email es requerido');
      return;
    }

    setSaving(true);
    try {
      await inviteUser(email, vecinoPiso || undefined);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error al enviar invitacion');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel w-[420px] max-w-[90vw] p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
              <Icon name="mail" size={14} className="text-cream" />
            </div>
            <span className="eyebrow">Invitar usuario</span>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-2 text-cocoa/40 hover:text-cocoa" aria-label="Cerrar">
            <Icon name="x" size={16} />
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(163,64,42,.08)', color: '#a3402a' }}>
            <Icon name="alertTriangle" size={14} />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(91,122,74,.1)', color: '#5b7a4a' }}>
            <Icon name="check" size={14} />
            Invitacion enviada correctamente
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-card" placeholder="vecino@email.com" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Piso (opcional)</label>
              <select value={vecinoPiso} onChange={(e) => setVecinoPiso(e.target.value)} className="input-card">
                <option value="">Sin piso...</option>
                {vecinos.map(v => <option key={v.piso} value={v.piso}>{v.piso}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-2">
              <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
              <button type="submit" disabled={saving} className="btn btn-primary">
                <Icon name="mail" size={14} />
                {saving ? 'Enviando...' : 'Enviar invitacion'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
```

- [ ] **Step 3: Verificar compilación**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/InviteUserModal.tsx
git commit -m "feat: crear InviteUserModal para invitar usuarios por email"
```

---

### Task 8: Frontend — actualizar UsuariosPage

**Files:**
- Modify: `src/pages/UsuariosPage.tsx`

- [ ] **Step 1: Eliminar estados del formulario inline y añadir estado del modal**

Cambiar:
```tsx
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [vecinoPiso, setVecinoPiso] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
```
Por:
```tsx
  const [showInviteModal, setShowInviteModal] = useState(false);
```

- [ ] **Step 2: Eliminar handleCreate**

Eliminar las líneas 42-57 completas (la función `handleCreate`).

- [ ] **Step 3: Cambiar el botón "Crear acceso"**

Cambiar:
```tsx
          <button onClick={() => setShowForm(!showForm)} className={`btn ${showForm ? 'btn-ghost' : 'btn-primary'}`}>
            <Icon name={showForm ? 'x' : 'plus'} size={14} />
            {showForm ? 'Cancelar' : 'Crear acceso'}
          </button>
```
Por:
```tsx
          <button onClick={() => setShowInviteModal(true)} className="btn btn-primary">
            <Icon name="plus" size={14} />
            Crear acceso
          </button>
```

- [ ] **Step 4: Eliminar todo el bloque `{showForm && (...)}`**

Eliminar desde la línea 132 hasta la línea 163 (todo el bloque del formulario inline).

- [ ] **Step 5: Añadir el modal al final del return**

Añadir justo antes de `</div>` final (después del bloque `{deletingUser && (...)}`):

```tsx
      {showInviteModal && (
        <InviteUserModal
          onClose={() => setShowInviteModal(false)}
          onSaved={() => fetchUsuarios()}
        />
      )}
```

- [ ] **Step 6: Añadir import**

```tsx
import InviteUserModal from '../components/InviteUserModal';
```

- [ ] **Step 7: Verificar compilación**

```bash
npm run build
```

- [ ] **Step 8: Commit**

```bash
git add src/pages/UsuariosPage.tsx
git commit -m "feat: reemplazar formulario inline por InviteUserModal en UsuariosPage"
```

---

### Task 9: Actualizar tests de integración

**Files:**
- Modify: `api/src/__tests__/routes.test.ts:706-755` (POST /admin/usuarios)
- Modify: `api/src/__tests__/routes.test.ts:976-986` (POST /admin/invitar existing user)
- Modify: `api/src/__tests__/routes.test.ts:376-382` (POST /auth/register existing user)

- [ ] **Step 1: Actualizar tests de POST /admin/usuarios**

Reemplazar el bloque `describe('POST /api/admin/usuarios', ...)` actual (líneas 706-755) por:

```ts
  describe('POST /api/admin/usuarios', () => {
    it('returns 400 when email is missing', async () => {
      const app = createApp();
      const token = userToken(true);
      const res = await request(app)
        .post('/api/admin/usuarios')
        .set('Authorization', `Bearer ${token}`)
        .send({ vecino_piso: '2A' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when vecino does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const app = createApp();
      const token = userToken(true);
      const res = await request(app)
        .post('/api/admin/usuarios')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'new@test.com', vecino_piso: 'Z9' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('El piso indicado no existe en el edificio');
    });

    it('sends invite for new user with piso', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ piso: '2A' }] });
      const app = createApp();
      const token = userToken(true);
      const res = await request(app)
        .post('/api/admin/usuarios')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'new@test.com', vecino_piso: '2A' });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Invitacion enviada');
    });

    it('sends invite for new user without piso', async () => {
      const app = createApp();
      const token = userToken(true);
      const res = await request(app)
        .post('/api/admin/usuarios')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'gestor@elite.com' });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Invitacion enviada');
    });
  });
```

- [ ] **Step 2: Eliminar test de bloqueo de usuario existente en POST /admin/invitar**

Eliminar el test `'returns 409 when user already exists'` (líneas 976-986) porque ya no debe bloquear.

- [ ] **Step 3: Cambiar test de registro con usuario existente**

Reemplazar el test `'returns 409 when user already exists for piso'` (líneas 376-382) por un test que verifique que **no** bloquea:

```ts
    it('allows registration even when user already exists for piso', async () => {
      mockVerifyEmailToken.mockResolvedValueOnce({ id: 1, email: 'a@a.com', piso: '2A' });
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 5 }] })
        .mockResolvedValueOnce({ rows: [{ id: 10, vecino_piso: '2A', email: 'a@a.com', is_admin: false }] });
      const app = createApp();
      const res = await request(app).post('/api/auth/register').send({ token: 'valid', password: 'Pass1234' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });
```

- [ ] **Step 4: Ejecutar tests**

```bash
cd api && npm test
```

Expected: todos los tests pasan.

- [ ] **Step 5: Commit**

```bash
git add api/src/__tests__/routes.test.ts
git commit -m "test: actualizar tests para invitacion por email y multi-usuario por piso"
```

---

### Task 10: Verificación final

- [ ] **Step 1: Typecheck backend**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 2: Build frontend**

```bash
npm run build
```

- [ ] **Step 3: Ejecutar todos los tests**

```bash
npm test
cd api && npm test
```

- [ ] **Step 4: Verificar git log**

```bash
git log --oneline -10
```
