# Ordenación de la tabla de Usuarios — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ordenar la tabla de Usuarios por piso por defecto y permitir ordenar por cualquier columna clicando su cabecera.

**Architecture:** Cambio 100 % en cliente. Se añade estado `sortKey`/`sortDir` a `UsuariosPage`, un conjunto de comparadores puros por columna, y se convierten las cabeceras ordenables en botones accesibles. La ordenación se aplica con `useMemo` sobre el resultado ya filtrado por la búsqueda.

**Tech Stack:** React + TypeScript, Tailwind CSS, Vitest + @testing-library/react.

---

## Estructura de archivos

- Modificar: `src/pages/UsuariosPage.tsx` — estado de ordenación, comparadores, cabeceras clicables.
- Test: `src/__tests__/UsuariosPage.test.tsx` — orden por defecto y orden al hacer clic.

---

## Task 1: Test de ordenación (falla primero)

**Files:**
- Create: `src/__tests__/UsuariosPage.test.tsx`

- [ ] **Step 1: Escribir el test que falla**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { apiFetch } from '../api/client';
import UsuariosPage from '../pages/UsuariosPage';

vi.mock('../api/client', () => ({
  apiFetch: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock('../store/auth', () => ({
  useAuthStore: vi.fn((selector?: any) => {
    const state = { user: { id: 1, role: 'admin', email: 'admin@x.com', vecino_piso: '1A' }, token: 't', loading: false };
    return selector ? selector(state) : state;
  }),
}));

const usuarios = [
  { id: 1, vecino_piso: '2A', email: 'b@x.com', role: 'usuario', created_at: '2026-01-01T00:00:00Z', ultima_conexion: null, ultima_consulta_ha: null },
  { id: 2, vecino_piso: null, email: 'c@x.com', role: 'admin', created_at: '2026-01-01T00:00:00Z', ultima_conexion: null, ultima_consulta_ha: null },
  { id: 3, vecino_piso: '1A', email: 'a@x.com', role: 'usuario', created_at: '2026-01-01T00:00:00Z', ultima_conexion: null, ultima_consulta_ha: null },
  { id: 4, vecino_piso: '10A', email: 'd@x.com', role: 'directiva', created_at: '2026-01-01T00:00:00Z', ultima_conexion: null, ultima_consulta_ha: null },
];

function getEmailOrder(): string[] {
  return Array.from(document.querySelectorAll('tbody tr td:first-child')).map((td) => td.textContent || '');
}

describe('UsuariosPage', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockResolvedValue(usuarios);
  });

  it('ordena por piso por defecto (sin piso primero, luego numérico + letra)', async () => {
    render(<MemoryRouter><UsuariosPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('a@x.com')).toBeInTheDocument());
    expect(getEmailOrder()).toEqual(['c@x.com', 'a@x.com', 'b@x.com', 'd@x.com']);
  });

  it('ordena por Email al hacer clic en su cabecera (asc y desc)', async () => {
    render(<MemoryRouter><UsuariosPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('a@x.com')).toBeInTheDocument());

    const emailHeader = screen.getByRole('button', { name: 'Email' });
    fireEvent.click(emailHeader);
    expect(getEmailOrder()).toEqual(['a@x.com', 'b@x.com', 'c@x.com', 'd@x.com']);

    fireEvent.click(emailHeader);
    expect(getEmailOrder()).toEqual(['d@x.com', 'c@x.com', 'b@x.com', 'a@x.com']);
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `npm test -- UsuariosPage`
Expected: FAIL. El test de orden por defecto falla porque la tabla se renderiza en el orden de `usuarios` (b@, c@, a@, d@), no `[c@, a@, b@, d@]`. El clic en la cabecera `Email` también falla porque aún no es un botón.

---

## Task 2: Implementar ordenación en UsuariosPage

**Files:**
- Modify: `src/pages/UsuariosPage.tsx`

- [ ] **Step 1: Añadir import de `useMemo`**

Cambiar la línea 1:

```tsx
import { useEffect, useState, useMemo } from 'react';
```

- [ ] **Step 2: Añadir tipos, helpers y comparadores a nivel de módulo (tras la interfaz `Usuario`)**

Insertar después del cierre de la interfaz `Usuario` (tras la línea 19):

```tsx
type SortKey = 'email' | 'piso' | 'rol' | 'estado' | 'ultima_conexion';
type SortDir = 'asc' | 'desc';

const roleOrder: Record<Role, number> = { admin: 0, directiva: 1, usuario: 2 };

function isOnline(date: string | null): boolean {
  if (!date) return false;
  return Date.now() - new Date(date).getTime() < 5 * 60 * 1000;
}

function parsePiso(piso: string): { num: number; letra: string } {
  const match = piso.match(/^(\d+)([A-Za-z]*)$/);
  if (!match) return { num: Number.MAX_SAFE_INTEGER, letra: piso.toLowerCase() };
  return { num: parseInt(match[1], 10), letra: (match[2] || '').toLowerCase() };
}

const comparators: Record<SortKey, (a: Usuario, b: Usuario) => number> = {
  email: (a, b) => a.email.toLowerCase().localeCompare(b.email.toLowerCase()),
  piso: (a, b) => {
    if (a.vecino_piso === null && b.vecino_piso === null) return 0;
    if (a.vecino_piso === null) return -1;
    if (b.vecino_piso === null) return 1;
    const pa = parsePiso(a.vecino_piso);
    const pb = parsePiso(b.vecino_piso);
    if (pa.num !== pb.num) return pa.num - pb.num;
    return pa.letra.localeCompare(pb.letra);
  },
  rol: (a, b) => roleOrder[a.role] - roleOrder[b.role],
  estado: (a, b) => Number(isOnline(a.ultima_conexion)) - Number(isOnline(b.ultima_conexion)),
  ultima_conexion: (a, b) => {
    if (a.ultima_conexion === null && b.ultima_conexion === null) return 0;
    if (a.ultima_conexion === null) return 1;
    if (b.ultima_conexion === null) return -1;
    return new Date(a.ultima_conexion).getTime() - new Date(b.ultima_conexion).getTime();
  },
};

function SortHeader({ label, k, sortKey, sortDir, onSort, align }: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  align?: 'center';
}) {
  const active = sortKey === k;
  return (
    <th
      scope="col"
      className={align === 'center' ? 'text-center' : undefined}
      aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
    >
      <button
        type="button"
        onClick={() => onSort(k)}
        className={`inline-flex items-center gap-1 cursor-pointer ${align === 'center' ? 'w-full justify-center' : ''}`}
      >
        {label}
        {active && <Icon name={sortDir === 'asc' ? 'chevronUp' : 'chevronDown'} size={11} />}
      </button>
    </th>
  );
}
```

- [ ] **Step 3: Eliminar la antigua `isOnline` definida dentro del componente**

Eliminar las líneas 56-59 (la definición local de `isOnline`), ya que ahora está a nivel de módulo:

```tsx
  const isOnline = (date: string | null) => {
    if (!date) return false;
    return Date.now() - new Date(date).getTime() < 5 * 60 * 1000;
  };
```

- [ ] **Step 4: Añadir estado y ordenación en el componente**

Tras el estado existente (por ejemplo, después de `const [deletingUser, setDeletingUser] = useState<Usuario | null>(null);`), añadir:

```tsx
  const [sortKey, setSortKey] = useState<SortKey>('piso');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };
```

Y después del `const filtered = ...` (línea 42), añadir:

```tsx
  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => dir * comparators[sortKey](a, b));
  }, [filtered, sortKey, sortDir]);
```

- [ ] **Step 5: Reemplazar el `<thead>` por cabeceras ordenables**

Sustituir las líneas 130-138 por:

```tsx
              <thead>
                <tr>
                  <SortHeader label="Email" k="email" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Piso" k="piso" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Rol" k="rol" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Estado" k="estado" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="center" />
                  <SortHeader label="Ult. conexión" k="ultima_conexion" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="center" />
                  <th scope="col" className="text-center min-w-[130px]">Acciones</th>
                </tr>
              </thead>
```

- [ ] **Step 6: Renderizar `sorted` en lugar de `filtered` en el cuerpo**

Cambiar la línea 141 de `{filtered.map((u, i) => (` a `{sorted.map((u, i) => (`.

---

## Task 3: Verificar tests y build

**Files:**
- (ninguno)

- [ ] **Step 1: Ejecutar el test**

Run: `npm test -- UsuariosPage`
Expected: PASS (2 tests).

- [ ] **Step 2: Ejecutar la suite completa y el build**

Run: `npm test`
Expected: todos los tests pasan.

Run: `npm run build`
Expected: compila sin errores de TypeScript.

---

## Task 4: Commit

- [ ] **Step 1: Commit**

```bash
git add src/pages/UsuariosPage.tsx src/__tests__/UsuariosPage.test.tsx
git commit -m "feat: ordenar tabla de usuarios por piso y por columna"
```

---

## Self-Review

**1. Spec coverage:** Orden por defecto por piso (Task 2, `sortKey='piso'` asc) ✓; cabeceras clicables Email/Piso/Rol/Estado/Últ. conexión (Task 2 Step 5) ✓; alternar asc/desc con flecha (Task 2, `toggleSort` + `SortHeader`) ✓; ordenación sobre filtrado (Task 2 Step 4, `sorted` a partir de `filtered`) ✓; criterios por columna (comparadores en Task 2 Step 2) ✓; tests (Task 1) ✓.

**2. Placeholder scan:** Sin TBD/TODO ni pasos sin código.

**3. Type consistency:** `SortKey`, `SortDir`, `comparators`, `SortHeader`, `toggleSort` usados con los mismos nombres en todos los pasos.
