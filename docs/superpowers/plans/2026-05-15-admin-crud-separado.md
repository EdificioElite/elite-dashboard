# Admin CRUD Separado Vecinos / Usuarios — Plan de Implementacion

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separar el panel admin en dos paginas independientes con CRUD completo (VecinosPage + UsuariosPage), añadir placeholder Aerotermia Global, y actualizar Header con navegacion admin.

**Architecture:** Tres paginas nuevas (`VecinosPage`, `UsuariosPage`, `AdminAerotermiaPage`), un modal nuevo (`DeleteVecinoModal`), refactor del Header para links condicionales de admin, y actualizacion de rutas en App.tsx. AdminPage actual se convierte en redirect.

**Tech Stack:** React + TypeScript + Tailwind, React Router, Zustand (auth store), Vitest + @testing-library/react

---

### Task 1: DeleteVecinoModal (nuevo componente)

**Files:**
- Create: `src/components/DeleteVecinoModal.tsx`

- [ ] **Step 1: Crear DeleteVecinoModal**

```typescript
import { useState } from 'react';
import { apiFetch } from '../api/client';
import Icon from './Icon';

interface Props {
  piso: string;
  userEmail: string | null;
  userId: number | null;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteVecinoModal({ piso, userEmail, userId, onClose, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async (deleteUser: boolean) => {
    setDeleting(true);
    setError('');
    try {
      if (deleteUser && userId) {
        await apiFetch(`/admin/usuarios/${userId}`, { method: 'DELETE' });
      }
      await apiFetch(`/admin/vecinos/${piso}`, { method: 'DELETE' });
      onDeleted();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(58,47,36,0.3)', backdropFilter: 'blur(4px)' }}>
      <div className="glass p-[26px] w-full max-w-[420px] animate-[fadeUp_250ms_ease-out]">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--rise)' }}>
              <Icon name="alertTriangle" size={14} className="text-cream" />
            </div>
            <span className="eyebrow">Eliminar vecino</span>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-2 text-cocoa/40 hover:text-cocoa">
            <Icon name="x" size={16} />
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(163,64,42,.08)', color: '#a3402a' }}>
            <Icon name="alertTriangle" size={14} />
            {error}
          </div>
        )}

        <p className="text-sm text-cocoa/70 mb-4">
          {userEmail
            ? `El vecino ${piso} tiene un usuario asociado (${userEmail}). ¿Que quieres hacer?`
            : `¿Eliminar el vecino ${piso}?`}
        </p>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} disabled={deleting} className="btn btn-ghost">Cancelar</button>
          {userEmail && (
            <button onClick={() => handleDelete(false)} disabled={deleting} className="btn btn-ghost text-cocoa/70">
              Solo desvincular
            </button>
          )}
          <button onClick={() => handleDelete(!!userEmail)} disabled={deleting} className="btn text-cream" style={{ background: 'var(--rise)' }}>
            <Icon name="trash" size={14} />
            {deleting ? 'Eliminando...' : userEmail ? 'Eliminar vecino y usuario' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar compilacion**

```bash
npx tsc --noEmit 2>&1 | head -10
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/DeleteVecinoModal.tsx
git commit -m "feat: añadir DeleteVecinoModal con opcion de eliminar usuario asociado"
```

---

### Task 2: AdminAerotermiaPage (placeholder)

**Files:**
- Create: `src/pages/AdminAerotermiaPage.tsx`

- [ ] **Step 1: Crear pagina placeholder**

```typescript
import Header from '../components/Header';

export default function AdminAerotermiaPage() {
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
            Aerotermia Global
          </h1>
          <p className="text-sm text-cocoa/60 mt-1.5 max-w-lg">
            Dashboard general de consumos y facturas del edificio.
          </p>
        </div>

        <div className="glass p-[40px] flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'var(--accent-soft)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
            </svg>
          </div>
          <p className="text-lg font-medium text-cocoa/50 mb-1">Proximamente</p>
          <p className="text-sm text-cocoa/30">Estamos preparando este dashboard.</p>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/AdminAerotermiaPage.tsx
git commit -m "feat: añadir AdminAerotermiaPage placeholder"
```

---

### Task 3: Header — links admin condicionales

**Files:**
- Modify: `src/components/Header.tsx`

- [ ] **Step 1: Actualizar PAGE_NAV y logica de render**

Cambia `PAGE_NAV` para que sea dinamico cuando el usuario es admin. Reemplaza las lineas 11-16 con:

```typescript
const USER_NAV = [
  { label: 'Inicio', path: '/inicio' },
  { label: 'Aerotermia', path: '/aerotermia' },
  { label: 'Juntas', path: '/juntas' },
  { label: 'Contactos', path: '/contactos' },
];

const ADMIN_NAV = [
  { label: 'Vecinos', path: '/admin/vecinos' },
  { label: 'Usuarios', path: '/admin/usuarios' },
  { label: 'Aerotermia', path: '/admin/aerotermia' },
];
```

Luego, dentro del componente, calcula los nav items basados en si el user es admin:

```typescript
  const navItems = user?.is_admin ? [...USER_NAV, ...ADMIN_NAV] : USER_NAV;
```

Reemplaza `PAGE_NAV` en el JSX (lineas 85 y 168) por `navItems`:

```tsx
          {navItems.map((item) => (
```

En linea 168 tambien:

```tsx
            {navItems.map((item) => (
```

**Elimina** el boton "Admin" (lineas 106-110) — borra ese bloque entero:

```tsx
        {showAdmin && user?.is_admin && (
          <button onClick={() => navigate('/admin')} className="btn btn-ghost text-xs">
            Admin
          </button>
        )}
```

- [ ] **Step 2: Quitar prop showAdmin del HeaderProps**

Al eliminar el boton Admin, la prop `showAdmin` ya no se usa. Elimina `showAdmin` de `HeaderProps` (lineas 7-9):

```typescript
interface HeaderProps {}
```

Y elimina `{ showAdmin }: HeaderProps` → `()`. La funcion queda: `export default function Header() {`

- [ ] **Step 3: Actualizar isActive para rutas admin**

Añade soporte para rutas admin en `isActive`:

```typescript
  const isActive = (path: string) =>
    location.pathname === path ||
    (path === '/aerotermia' && location.pathname === '/dashboard') ||
    (path === '/admin/aerotermia' && location.pathname === '/admin/aerotermia');
```

- [ ] **Step 4: Buscar y actualizar usos de Header en otras paginas**

Busca `showAdmin` en todas las paginas:

```bash
grep -rn "showAdmin" src/
```

Quita la prop `showAdmin` de todos los componentes `<Header showAdmin />` → `<Header />`.

- [ ] **Step 5: Verificar compilacion**

```bash
npm run build 2>&1 | tail -5
```
Expected: BUILD SUCCESS.

- [ ] **Step 6: Commit**

```bash
git add src/components/Header.tsx src/pages/*.tsx
git commit -m "feat: navegacion admin condicional en header (Vecinos, Usuarios, Aerotermia)"
```

---

### Task 4: VecinosPage (nuevo)

**Files:**
- Create: `src/pages/VecinosPage.tsx`

- [ ] **Step 1: Crear VecinosPage con tabla y CRUD**

```typescript
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import Header from '../components/Header';
import Icon from '../components/Icon';
import EditVecinoModal from '../components/EditVecinoModal';
import DeleteVecinoModal from '../components/DeleteVecinoModal';

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

export default function VecinosPage() {
  const navigate = useNavigate();
  const [vecinos, setVecinos] = useState<Vecino[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingVecinoData, setEditingVecinoData] = useState<Vecino | null>(null);
  const [deletingVecino, setDeletingVecino] = useState<Vecino | null>(null);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Form state
  const [newPiso, setNewPiso] = useState('');
  const [newNombre, setNewNombre] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCoeficiente, setNewCoeficiente] = useState('');
  const [newEnviarEmail, setNewEnviarEmail] = useState(false);
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newSerialNumber, setNewSerialNumber] = useState('');

  const fetchVecinos = () => {
    apiFetch<Vecino[]>('/admin/vecinos').then(setVecinos).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchVecinos(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    try {
      await apiFetch('/admin/vecinos', {
        method: 'POST',
        body: JSON.stringify({
          piso: newPiso,
          nombre: newNombre || null,
          email: newEmail || null,
          coeficiente: newCoeficiente || null,
          enviar_email: newEnviarEmail,
          device_identification: newDeviceId || null,
          serial_number: newSerialNumber || null,
        }),
      });
      setFormSuccess('Vecino creado');
      setNewPiso(''); setNewNombre(''); setNewEmail(''); setNewCoeficiente('');
      setNewEnviarEmail(false); setNewDeviceId(''); setNewSerialNumber('');
      setShowForm(false);
      fetchVecinos();
    } catch (err: any) {
      setFormError(err.message || 'Error al crear vecino');
    }
  };

  const filtered = vecinos.filter(v =>
    v.piso.toLowerCase().includes(search.toLowerCase()) ||
    (v.nombre && v.nombre.toLowerCase().includes(search.toLowerCase()))
  );

  const stats = [
    { label: 'Vecinos', value: vecinos.length, icon: 'users', iconColor: 'var(--accent)' },
    { label: 'Con email facturas', value: vecinos.filter(v => v.vecino_email).length, icon: 'mail', iconColor: 'var(--sage)' },
    { label: 'Con usuario', value: vecinos.filter(v => v.user_id).length, icon: 'check', iconColor: 'var(--accent-2)' },
  ];

  if (loading) return <div><Header /><main className="max-w-[1180px] mx-auto px-6 flex items-center justify-center min-h-[60vh]"><div className="text-cocoa/40 text-sm">Cargando...</div></main></div>;

  return (
    <div className="page-in">
      <Header />

      <main className="max-w-[1180px] mx-auto px-6 flex flex-col gap-[22px] pb-10">
        <div className="pt-2 flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="eyebrow">Panel de administracion</p>
            <h1 className="font-display text-[40px] font-medium text-cocoa mt-1" style={{ letterSpacing: '-0.02em' }}>Vecinos</h1>
            <p className="text-sm text-cocoa/60 mt-1.5 max-w-lg">Gestiona los vecinos del edificio.</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className={`btn ${showForm ? 'btn-ghost' : 'btn-primary'}`}>
            <Icon name={showForm ? 'x' : 'plus'} size={14} />
            {showForm ? 'Cancelar' : 'Crear vecino'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-[16px]">
          {stats.map(s => (
            <div key={s.label} className="glass p-[20px]">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: s.iconColor }}>
                  <Icon name={s.icon} size={12} className="text-cream" />
                </div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-cocoa/40">{s.label}</span>
              </div>
              <span className="font-display text-[32px] font-medium leading-none text-cocoa" style={{ letterSpacing: '-0.02em' }}>{s.value}</span>
            </div>
          ))}
        </div>

        {showForm && (
          <div className="glass p-[26px]">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
                <Icon name="plus" size={14} className="text-cream" />
              </div>
              <span className="eyebrow">Nuevo vecino</span>
            </div>
            {formError && <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(163,64,42,.08)', color: '#a3402a' }}><Icon name="alertTriangle" size={14} />{formError}</div>}
            {formSuccess && <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(91,122,74,.1)', color: '#5b7a4a' }}><Icon name="check" size={14} />{formSuccess}</div>}
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Piso *</label>
                <input type="text" value={newPiso} onChange={e => setNewPiso(e.target.value)} required className="input-card" placeholder="1A" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Nombre</label>
                <input type="text" value={newNombre} onChange={e => setNewNombre(e.target.value)} className="input-card" placeholder="Nombre del vecino" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Email facturas</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="input-card" placeholder="vecino@email.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Coeficiente</label>
                <input type="text" value={newCoeficiente} onChange={e => setNewCoeficiente(e.target.value)} className="input-card" placeholder="0.20" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Device ID</label>
                <input type="text" value={newDeviceId} onChange={e => setNewDeviceId(e.target.value)} className="input-card" placeholder="DEVID001" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Serial Number</label>
                <input type="text" value={newSerialNumber} onChange={e => setNewSerialNumber(e.target.value)} className="input-card" placeholder="10000001" />
              </div>
              <div className="md:col-span-3 flex items-center gap-3">
                <input type="checkbox" id="newEnviarEmail" checked={newEnviarEmail} onChange={e => setNewEnviarEmail(e.target.checked)} className="w-4 h-4 rounded accent-[var(--accent)]" />
                <label htmlFor="newEnviarEmail" className="text-sm text-cocoa/70 cursor-pointer select-none">Enviar facturas por email</label>
              </div>
              <div className="md:col-span-3 flex justify-end">
                <button type="submit" className="btn btn-primary"><Icon name="check" size={14} />Guardar</button>
              </div>
            </form>
          </div>
        )}

        <div className="glass p-[26px]">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-2)' }}>
              <Icon name="users" size={14} className="text-cream" />
            </div>
            <span className="eyebrow">Listado</span>
            <div className="ml-auto flex items-center gap-2">
              <Icon name="search" size={14} className="text-cocoa/30" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar vecino..." className="bg-transparent border-none text-sm text-cocoa placeholder-cocoa/25 outline-none w-40" />
            </div>
          </div>

          <div className="overflow-x-auto -mx-2">
            <table className="table-glass">
              <thead>
                <tr>
                  <th>Piso</th>
                  <th>Nombre</th>
                  <th>Email facturas</th>
                  <th>Coeficiente</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v, i) => (
                  <tr key={v.piso} className="row-stagger" style={{ animationDelay: `${i * 40}ms` }}>
                    <td className="font-medium text-cocoa">{v.piso}</td>
                    <td className="text-cocoa/60">{v.nombre || '—'}</td>
                    <td className="text-sm text-cocoa/50">{v.vecino_email || '—'}</td>
                    <td className="text-sm text-cocoa/50">{v.coeficiente || '—'}</td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => navigate(`/admin/vecino/${v.piso}`)} className="btn btn-ghost p-2 text-accent hover:text-accent/80" title="Ver aerotermia">
                          <Icon name="chart" size={15} />
                        </button>
                        <button onClick={() => setEditingVecinoData(v)} className="btn btn-ghost p-2 text-cocoa/40 hover:text-accent-2" title="Editar vecino">
                          <Icon name="edit" size={15} />
                        </button>
                        <button onClick={() => setDeletingVecino(v)} className="btn btn-ghost p-2 text-cocoa/40 hover:text-red-600" title="Eliminar vecino">
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="text-sm text-cocoa/40 py-8 text-center">No se encontraron vecinos</div>}
          </div>
        </div>
      </main>

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
          onSaved={() => { setEditingVecinoData(null); fetchVecinos(); }}
        />
      )}

      {deletingVecino && (
        <DeleteVecinoModal
          piso={deletingVecino.piso}
          userEmail={deletingVecino.email}
          userId={deletingVecino.user_id}
          onClose={() => setDeletingVecino(null)}
          onDeleted={() => { setDeletingVecino(null); fetchVecinos(); }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar compilacion**

```bash
npm run build 2>&1 | tail -5
```
Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit**

```bash
git add src/pages/VecinosPage.tsx
git commit -m "feat: añadir VecinosPage con CRUD completo"
```

---

### Task 5: UsuariosPage (nuevo)

**Files:**
- Create: `src/pages/UsuariosPage.tsx`

- [ ] **Step 1: Crear UsuariosPage**

```typescript
import { useEffect, useState, FormEvent } from 'react';
import { apiFetch } from '../api/client';
import { useAuthStore } from '../store/auth';
import Header from '../components/Header';
import Icon from '../components/Icon';
import EditUserModal from '../components/EditUserModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import DeleteUserModal from '../components/DeleteUserModal';

interface Usuario {
  id: number;
  vecino_piso: string | null;
  email: string;
  is_admin: boolean;
  created_at: string;
}

export default function UsuariosPage() {
  const user = useAuthStore(s => s.user);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [vecinoPiso, setVecinoPiso] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [changingPassword, setChangingPassword] = useState<Usuario | null>(null);
  const [deletingUser, setDeletingUser] = useState<Usuario | null>(null);

  const fetchUsuarios = () => {
    apiFetch<Usuario[]>('/admin/usuarios').then(setUsuarios).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsuarios(); }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    try {
      const body: Record<string, string> = { email, password };
      if (vecinoPiso) body.vecino_piso = vecinoPiso;
      await apiFetch('/admin/usuarios', { method: 'POST', body: JSON.stringify(body) });
      setFormSuccess('Usuario creado');
      setEmail(''); setPassword(''); setVecinoPiso('');
      setShowForm(false);
      fetchUsuarios();
    } catch (err: any) {
      setFormError(err.message || 'Error al crear usuario');
    }
  };

  const filtered = usuarios.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.vecino_piso && u.vecino_piso.toLowerCase().includes(search.toLowerCase()))
  );

  const stats = [
    { label: 'Usuarios', value: usuarios.length, icon: 'users', iconColor: 'var(--accent)' },
    { label: 'Admins', value: usuarios.filter(u => u.is_admin).length, icon: 'settings', iconColor: 'var(--accent-2)' },
    { label: 'Con piso', value: usuarios.filter(u => u.vecino_piso).length, icon: 'check', iconColor: 'var(--sage)' },
  ];

  if (loading) return <div><Header /><main className="max-w-[1180px] mx-auto px-6 flex items-center justify-center min-h-[60vh]"><div className="text-cocoa/40 text-sm">Cargando...</div></main></div>;

  return (
    <div className="page-in">
      <Header />

      <main className="max-w-[1180px] mx-auto px-6 flex flex-col gap-[22px] pb-10">
        <div className="pt-2 flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="eyebrow">Panel de administracion</p>
            <h1 className="font-display text-[40px] font-medium text-cocoa mt-1" style={{ letterSpacing: '-0.02em' }}>Usuarios</h1>
            <p className="text-sm text-cocoa/60 mt-1.5 max-w-lg">Gestiona los accesos al dashboard.</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className={`btn ${showForm ? 'btn-ghost' : 'btn-primary'}`}>
            <Icon name={showForm ? 'x' : 'plus'} size={14} />
            {showForm ? 'Cancelar' : 'Crear acceso'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-[16px]">
          {stats.map(s => (
            <div key={s.label} className="glass p-[20px]">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: s.iconColor }}>
                  <Icon name={s.icon} size={12} className="text-cream" />
                </div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-cocoa/40">{s.label}</span>
              </div>
              <span className="font-display text-[32px] font-medium leading-none text-cocoa" style={{ letterSpacing: '-0.02em' }}>{s.value}</span>
            </div>
          ))}
        </div>

        {showForm && (
          <div className="glass p-[26px]">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
                <Icon name="plus" size={14} className="text-cream" />
              </div>
              <span className="eyebrow">Nuevo acceso</span>
            </div>
            {formError && <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(163,64,42,.08)', color: '#a3402a' }}><Icon name="alertTriangle" size={14} />{formError}</div>}
            {formSuccess && <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(91,122,74,.1)', color: '#5b7a4a' }}><Icon name="check" size={14} />{formSuccess}</div>}
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Piso</label>
                <select value={vecinoPiso} onChange={e => setVecinoPiso(e.target.value)} className="input-card">
                  <option value="">Sin piso (usuario global)...</option>
                  {usuarios.map(u => u.vecino_piso && <option key={u.vecino_piso} value={u.vecino_piso}>{u.vecino_piso}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="input-card" placeholder="vecino@email.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cocoa/40 mb-1.5">Contrasena</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="input-card" placeholder="••••••••" />
              </div>
              <div className="md:col-span-3 flex justify-end">
                <button type="submit" className="btn btn-primary"><Icon name="check" size={14} />Guardar</button>
              </div>
            </form>
          </div>
        )}

        <div className="glass p-[26px]">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-2)' }}>
              <Icon name="users" size={14} className="text-cream" />
            </div>
            <span className="eyebrow">Listado</span>
            <div className="ml-auto flex items-center gap-2">
              <Icon name="search" size={14} className="text-cocoa/30" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar usuario..." className="bg-transparent border-none text-sm text-cocoa placeholder-cocoa/25 outline-none w-40" />
            </div>
          </div>

          <div className="overflow-x-auto -mx-2">
            <table className="table-glass">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Piso</th>
                  <th>Rol</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr key={u.id} className="row-stagger" style={{ animationDelay: `${i * 40}ms` }}>
                    <td className="text-sm text-cocoa">{u.email}</td>
                    <td className="text-sm text-cocoa/60">{u.vecino_piso || '—'}</td>
                    <td>{u.is_admin ? <span className="chip chip-accent">Admin</span> : <span className="chip">Vecino</span>}</td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setEditingUser(u)} className="btn btn-ghost p-2 text-cocoa/40 hover:text-cocoa" title="Editar usuario"><Icon name="edit" size={15} /></button>
                        <button onClick={() => setChangingPassword(u)} className="btn btn-ghost p-2 text-cocoa/40 hover:text-cocoa" title="Cambiar contrasena"><Icon name="key" size={15} /></button>
                        {u.id !== user?.id && (
                          <button onClick={() => setDeletingUser(u)} className="btn btn-ghost p-2 text-cocoa/40 hover:text-red-600" title="Eliminar usuario"><Icon name="trash" size={15} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {editingUser && (
        <EditUserModal
          vecino={{ piso: editingUser.vecino_piso || '', nombre: '', user_id: editingUser.id, email: editingUser.email, is_admin: editingUser.is_admin }}
          vecinos={usuarios.map(u => ({ piso: u.vecino_piso || '', nombre: '', user_id: u.id, email: u.email, is_admin: u.is_admin }))}
          currentUserId={user?.id || 0}
          onClose={() => setEditingUser(null)}
          onSaved={() => { setEditingUser(null); fetchUsuarios(); }}
        />
      )}

      {changingPassword && (
        <ChangePasswordModal userId={changingPassword.id} userName={changingPassword.email} onClose={() => setChangingPassword(null)} onSaved={() => setChangingPassword(null)} />
      )}

      {deletingUser && (
        <DeleteUserModal userId={deletingUser.id} userName={deletingUser.email} onClose={() => setDeletingUser(null)} onDeleted={() => { setDeletingUser(null); fetchUsuarios(); }} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/UsuariosPage.tsx
git commit -m "feat: añadir UsuariosPage con CRUD completo"
```

---

### Task 6: App.tsx — actualizar rutas

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Actualizar rutas**

Reemplaza las rutas de admin en App.tsx. Busca el bloque que contiene `/admin` y `/admin/vecino/:piso` (lineas ~60-75) y reemplazalo con:

```tsx
          <Route path="/admin" element={<Navigate to="/admin/vecinos" replace />} />
          <Route
            path="/admin/vecinos"
            element={
              <ProtectedRoute adminOnly>
                <VecinosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/usuarios"
            element={
              <ProtectedRoute adminOnly>
                <UsuariosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/aerotermia"
            element={
              <ProtectedRoute adminOnly>
                <AdminAerotermiaPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/vecino/:piso"
            element={
              <ProtectedRoute adminOnly>
                <AdminConsumoPage />
              </ProtectedRoute>
            }
          />
```

**Importa** las nuevas paginas (añade arriba):

```typescript
import VecinosPage from './pages/VecinosPage';
import UsuariosPage from './pages/UsuariosPage';
import AdminAerotermiaPage from './pages/AdminAerotermiaPage';
```

**Elimina** el import de AdminPage si ya no se usa.

- [ ] **Step 2: Verificar build**

```bash
npm run build 2>&1 | tail -5
```
Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: actualizar rutas admin con VecinosPage, UsuariosPage y AdminAerotermiaPage"
```

---

### Task 7: Limpiar AdminPage antigua

**Files:**
- Delete: `src/pages/AdminPage.tsx`

- [ ] **Step 1: Eliminar AdminPage y su test**

```bash
git rm src/pages/AdminPage.tsx src/pages/AdminPage.test.tsx
```

- [ ] **Step 2: Commit**

```bash
git commit -m "refactor: eliminar AdminPage antigua (reemplazada por VecinosPage + UsuariosPage)"
```

---

### Task 8: Verificacion final

- [ ] **Step 1: Build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 2: Tests**

```bash
npm test 2>&1 | tail -5
cd api && npm test 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "chore: verificacion final" && git push
```
