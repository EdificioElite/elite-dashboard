# Self-Service Password Change Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que un usuario autenticado cambie su propia contrasena desde el menu del header.

**Architecture:** Nuevo endpoint `PUT /api/auth/password` (solo auth, sin admin) que verifica la contrasena actual y aplica la nueva con validacion de complejidad (>=8 chars, mayuscula, minuscula, numero). Nuevo modal `SelfPasswordModal` en frontend con 3 campos. Integracion en `Header.tsx` habilitando el boton existente.

**Tech Stack:** Express, bcrypt, React, TypeScript, Vitest, Supertest, @testing-library/react

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `api/src/routes/auth.ts` | Modify | New `PUT /auth/password` endpoint |
| `api/src/__tests__/routes.test.ts` | Modify | Tests for the new endpoint |
| `src/api/client.ts` | Modify | `changeOwnPassword()` function |
| `src/components/SelfPasswordModal.tsx` | Create | Modal with current + new + confirm fields |
| `src/components/SelfPasswordModal.test.tsx` | Create | Component tests |
| `src/components/Header.tsx` | Modify | Enable "Cambiar contrasena" button, wire modal |

---

### Task 1: Backend — `PUT /api/auth/password` endpoint

**Files:**
- Modify: `api/src/routes/auth.ts:59-66` (after `/auth/me`)

- [ ] **Step 1: Write backend tests**

Add to `api/src/__tests__/routes.test.ts`, inside the `describe('Auth routes', ...)` block, after the `GET /api/health` tests (after line 127):

```ts
  describe('PUT /api/auth/password', () => {
    it('returns 401 without token', async () => {
      const app = createApp();
      const res = await request(app)
        .put('/api/auth/password')
        .send({ currentPassword: 'old', newPassword: 'NewPass1' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when currentPassword is missing', async () => {
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ newPassword: 'NewPass1' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('actual');
    });

    it('returns 400 when newPassword is missing', async () => {
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'old' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('nueva');
    });

    it('returns 400 when newPassword is too short', async () => {
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'old', newPassword: 'Abc1' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('8 caracteres');
    });

    it('returns 400 when newPassword lacks uppercase', async () => {
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'old', newPassword: 'abcdefg1' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('mayuscula');
    });

    it('returns 400 when newPassword lacks lowercase', async () => {
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'old', newPassword: 'ABCDEFG1' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('minuscula');
    });

    it('returns 400 when newPassword lacks digit', async () => {
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'old', newPassword: 'Abcdefgh' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('numero');
    });

    it('returns 401 when currentPassword is wrong', async () => {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('correct', 12);
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, password_hash: hash }],
      });
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'wrong', newPassword: 'NewPass1' });
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('actual');
    });

    it('changes password successfully', async () => {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('correct', 12);
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1, password_hash: hash }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });
      const app = createApp();
      const token = userToken();
      const res = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'correct', newPassword: 'NewPass1' });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Contrasena actualizada');
    });
  });
```

- [ ] **Step 2: Run backend tests to verify they fail**

```bash
cd api && npm test
```

Expected: 9 new tests in `PUT /api/auth/password` suite should all FAIL with 404 (route not found).

- [ ] **Step 3: Add `PUT /api/auth/password` endpoint**

In `api/src/routes/auth.ts`, add after the `GET /api/auth/me` handler (after line 66):

```ts
router.put('/auth/password', authMiddleware, rateLimit(5, 60 * 1000), async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword) {
      res.status(400).json({ error: 'La contrasena actual es requerida' });
      return;
    }
    if (!newPassword) {
      res.status(400).json({ error: 'La nueva contrasena es requerida' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ error: 'La contrasena debe tener al menos 8 caracteres' });
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      res.status(400).json({ error: 'La contrasena debe contener al menos una mayuscula' });
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      res.status(400).json({ error: 'La contrasena debe contener al menos una minuscula' });
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      res.status(400).json({ error: 'La contrasena debe contener al menos un numero' });
      return;
    }

    const result = await query(
      'SELECT id, password_hash FROM usuarios WHERE id = $1',
      [req.user!.userId]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Usuario no encontrado' });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!valid) {
      res.status(401).json({ error: 'La contrasena actual es incorrecta' });
      return;
    }

    const password_hash = await bcrypt.hash(newPassword, 12);
    await query(
      'UPDATE usuarios SET password_hash = $1 WHERE id = $2',
      [password_hash, req.user!.userId]
    );

    res.json({ message: 'Contrasena actualizada' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
```

- [ ] **Step 4: Run backend tests to verify they pass**

```bash
cd api && npm test
```

Expected: All 9 new tests in `PUT /api/auth/password` suite PASS.

- [ ] **Step 5: Commit backend**

```bash
git add api/src/routes/auth.ts api/src/__tests__/routes.test.ts
git commit -m "feat: endpoint PUT /api/auth/password para cambio de contrasena self-service"
```

---

### Task 2: Frontend API client

**Files:**
- Modify: `src/api/client.ts:47` (after `changePassword`)

- [ ] **Step 1: Add `changeOwnPassword` function**

Add after line 47 in `src/api/client.ts`:

```ts
export async function changeOwnPassword(currentPassword: string, newPassword: string) {
  return apiFetch<{ message: string }>('/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/api/client.ts
git commit -m "feat: funcion changeOwnPassword en cliente API"
```

---

### Task 3: SelfPasswordModal component + tests

**Files:**
- Create: `src/components/SelfPasswordModal.tsx`
- Create: `src/components/SelfPasswordModal.test.tsx`

- [ ] **Step 1: Write component test**

Create `src/components/SelfPasswordModal.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SelfPasswordModal from './SelfPasswordModal';
import * as client from '../api/client';

vi.mock('../api/client', () => ({
  changeOwnPassword: vi.fn(),
}));

describe('SelfPasswordModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders three password fields', () => {
    render(<SelfPasswordModal onClose={onClose} />);
    expect(screen.getByLabelText('Contrasena actual')).toBeInTheDocument();
    expect(screen.getByLabelText('Nueva contrasena')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar contrasena')).toBeInTheDocument();
  });

  it('shows error when new password is too short', async () => {
    const user = userEvent.setup();
    render(<SelfPasswordModal onClose={onClose} />);
    await user.type(screen.getByLabelText('Contrasena actual'), 'oldpass');
    await user.type(screen.getByLabelText('Nueva contrasena'), 'Ab1');
    await user.type(screen.getByLabelText('Confirmar contrasena'), 'Ab1');
    await user.click(screen.getByRole('button', { name: /cambiar/i }));
    expect(screen.getByText(/8 caracteres/)).toBeInTheDocument();
  });

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup();
    render(<SelfPasswordModal onClose={onClose} />);
    await user.type(screen.getByLabelText('Contrasena actual'), 'oldpass');
    await user.type(screen.getByLabelText('Nueva contrasena'), 'NewPass1');
    await user.type(screen.getByLabelText('Confirmar contrasena'), 'NewPass2');
    await user.click(screen.getByRole('button', { name: /cambiar/i }));
    expect(screen.getByText(/no coinciden/)).toBeInTheDocument();
  });

  it('calls changeOwnPassword and shows success', async () => {
    const user = userEvent.setup();
    vi.mocked(client.changeOwnPassword).mockResolvedValueOnce({ message: 'Contrasena actualizada' });
    render(<SelfPasswordModal onClose={onClose} />);
    await user.type(screen.getByLabelText('Contrasena actual'), 'oldpass');
    await user.type(screen.getByLabelText('Nueva contrasena'), 'NewPass1');
    await user.type(screen.getByLabelText('Confirmar contrasena'), 'NewPass1');
    await user.click(screen.getByRole('button', { name: /cambiar/i }));
    expect(client.changeOwnPassword).toHaveBeenCalledWith('oldpass', 'NewPass1');
    await waitFor(() => {
      expect(screen.getByText(/actualizada/)).toBeInTheDocument();
    });
  });

  it('shows error from API', async () => {
    const user = userEvent.setup();
    vi.mocked(client.changeOwnPassword).mockRejectedValueOnce(new Error('La contrasena actual es incorrecta'));
    render(<SelfPasswordModal onClose={onClose} />);
    await user.type(screen.getByLabelText('Contrasena actual'), 'wrong');
    await user.type(screen.getByLabelText('Nueva contrasena'), 'NewPass1');
    await user.type(screen.getByLabelText('Confirmar contrasena'), 'NewPass1');
    await user.click(screen.getByRole('button', { name: /cambiar/i }));
    await waitFor(() => {
      expect(screen.getByText(/incorrecta/)).toBeInTheDocument();
    });
  });

  it('closes on X button click', async () => {
    const user = userEvent.setup();
    render(<SelfPasswordModal onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /cerrar/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Cancelar button click', async () => {
    const user = userEvent.setup();
    render(<SelfPasswordModal onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --run src/components/SelfPasswordModal.test.tsx
```

Expected: FAIL (module not found).

- [ ] **Step 3: Create SelfPasswordModal component**

Create `src/components/SelfPasswordModal.tsx`:

```tsx
import { useState, FormEvent } from 'react';
import Icon from './Icon';
import { changeOwnPassword } from '../api/client';

interface Props {
  onClose: () => void;
}

export default function SelfPasswordModal({ onClose }: Props) {
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const validate = (): string | null => {
    if (!current) return 'La contrasena actual es requerida';
    if (password.length < 8) return 'La contrasena debe tener al menos 8 caracteres';
    if (!/[A-Z]/.test(password)) return 'La contrasena debe contener al menos una mayuscula';
    if (!/[a-z]/.test(password)) return 'La contrasena debe contener al menos una minuscula';
    if (!/[0-9]/.test(password)) return 'La contrasena debe contener al menos un numero';
    if (password !== confirm) return 'Las contrasenas no coinciden';
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      await changeOwnPassword(current, password);
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err: any) {
      setError(err.message || 'Error al cambiar contrasena');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(58,47,36,0.3)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="glass p-[26px] w-full max-w-[420px] animate-[fadeUp_250ms_ease-out]">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--accent-2)' }}
            >
              <Icon name="key" size={14} className="text-cream" />
            </div>
            <span className="eyebrow">Cambiar contrasena</span>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost p-2 text-cocoa/40 hover:text-cocoa"
            aria-label="Cerrar"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {success ? (
          <div
            className="px-4 py-3 rounded-xl text-sm flex items-center gap-2"
            style={{ background: 'rgba(52,199,89,0.1)', color: '#34c759' }}
          >
            <Icon name="check" size={14} />
            Contrasena actualizada correctamente
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div
                className="px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                style={{ background: 'rgba(163,64,42,.08)', color: '#a3402a' }}
              >
                <Icon name="alertTriangle" size={14} />
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">
                Contrasena actual
              </label>
              <input
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
                className="input-card"
                placeholder="Tu contrasena actual"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">
                Nueva contrasena
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="input-card"
                placeholder="Minimo 8 caracteres, mayuscula, minuscula y numero"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">
                Confirmar contrasena
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                className="input-card"
                placeholder="Repetir nueva contrasena"
              />
            </div>
            <div className="flex justify-end gap-3 mt-2">
              <button type="button" onClick={onClose} className="btn btn-ghost">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="btn btn-primary">
                <Icon name="check" size={14} />
                {saving ? 'Cambiando...' : 'Cambiar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --run src/components/SelfPasswordModal.test.tsx
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/SelfPasswordModal.tsx src/components/SelfPasswordModal.test.tsx
git commit -m "feat: componente SelfPasswordModal con tests"
```

---

### Task 4: Enable button in Header

**Files:**
- Modify: `src/components/Header.tsx:110-115`

- [ ] **Step 1: Modify Header to enable button and wire modal**

In `src/components/Header.tsx`, make these changes:

1. Add import at the top (after line 3):
```tsx
import SelfPasswordModal from './SelfPasswordModal';
```

2. Add state after `const [open, setOpen] = useState(false);` (line 21):
```tsx
const [showPasswordModal, setShowPasswordModal] = useState(false);
```

3. Replace the disabled button (lines 110-115):
```tsx
              <button
                onClick={() => { setOpen(false); setShowPasswordModal(true); }}
                className="w-full text-left px-4 py-2 text-[12.5px] text-cocoa/70 hover:text-cocoa hover:bg-white/5 bg-transparent border-none cursor-pointer font-sans"
              >
                Cambiar contrasena
              </button>
```

4. Add the modal render just before the closing `</header>` tag (before line 127):
```tsx
      {showPasswordModal && <SelfPasswordModal onClose={() => setShowPasswordModal(false)} />}
```

- [ ] **Step 2: Run frontend tests**

```bash
npm test -- --run
```

Expected: All existing tests PASS.

- [ ] **Step 3: Verify frontend builds**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/Header.tsx
git commit -m "feat: habilitar boton Cambiar contrasena en header"
```

---

### Task 5: Verification

- [ ] **Step 1: Run full backend test suite**

```bash
cd api && npm test
```

Expected: All tests PASS.

- [ ] **Step 2: Run full frontend test suite**

```bash
npm test -- --run
```

Expected: All tests PASS.

- [ ] **Step 3: Verify backend typecheck**

```bash
cd api && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Verify frontend build**

```bash
npm run build
```

Expected: Build succeeds.

---

### Task 6: Final commit (if any cleanup needed)

After verification, if no issues, the feature is complete.
