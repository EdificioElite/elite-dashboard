# Rediseno Calido Refinado — Plan de Implementacion

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refinar visualmente todo el dashboard elevando contraste WCAG AA, anadiendo sidebar admin, mejorando charts/tablas/KPI cards y refinando la navegacion, manteniendo la identidad calida actual.

**Architecture:** CSS-first: los cambios pesados son en `index.css` (design tokens + clases) y `tailwind.config.js`. La sidebar admin es un componente nuevo que vive en App.tsx junto al Header slim (52px). Las paginas se adaptan al nuevo layout sin reescribir logica de negocio.

**Tech Stack:** React 19, TypeScript strict, Tailwind CSS 3.4, Recharts, Zustand, Vite

---

## Fase 1: Tokens y Base CSS

### Task 1: Actualizar Tailwind config

**Files:**
- Modify: `tailwind.config.js`

- [ ] **Step 1: Reemplazar paleta de colores en tailwind.config.js**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: '#FFFBF5',
        sand: '#EDE0CC',
        camel: '#C9A87C',
        wheat: '#E8D5C0',
        cocoa: '#1E140A',
        accent: '#A6754B',
        'accent-dark': '#8C5E3A',
        sage: '#5D7A4A',
        'sage-dark': '#4A6338',
        rise: '#8A2A1E',
        calor: '#B53228',
        frio: '#4A7A8C',
      },
      fontFamily: {
        sans: ["'Manrope'", 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ["'Fraunces'", 'ui-serif', 'Georgia', 'serif'],
        mono: ["'JetBrains Mono'", 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xl: '28px',
        lg: '20px',
        md: '14px',
        sm: '10px',
      },
      boxShadow: {
        glass:
          '0 1px 0 rgba(255,255,255,.5) inset, 0 12px 32px -16px rgba(30,20,10,.12), 0 4px 12px -6px rgba(30,20,10,.08)',
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: Commit**

```bash
git add tailwind.config.js
git commit -m "feat: actualizar paleta de colores y tipografia en tailwind config"
```

### Task 2: Actualizar design tokens en index.css

**Files:**
- Modify: `src/index.css:1-53`

- [ ] **Step 1: Reemplazar el bloque `:root` con los nuevos tokens**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --bg-base: #FFFBF5;
    --bg-tint-1: #EDE0CC;
    --bg-tint-2: #D4C4A8;
    --bg-tint-3: #E8D5C0;
    --ink: #1E140A;
    --ink-soft: rgba(30, 20, 10, 0.70);
    --ink-mute: rgba(30, 20, 10, 0.48);
    --line: rgba(30, 20, 10, 0.10);
    --line-soft: rgba(30, 20, 10, 0.06);
    --accent: #A6754B;
    --accent-dark: #8C5E3A;
    --accent-soft: #C9A87C;
    --sage: #5D7A4A;
    --sage-dark: #4A6338;
    --calor: #B53228;
    --frio: #4A7A8C;
    --glass-bg: rgba(255, 251, 245, 0.85);
    --glass-bg-strong: rgba(255, 251, 245, 0.92);
    --glass-stroke: rgba(30, 20, 10, 0.06);
    --glass-blur: 12px;
    --glass-shadow: 0 1px 3px rgba(30, 20, 10, 0.04);
    --radius-xl: 28px;
    --radius-lg: 20px;
    --radius-md: 14px;
    --radius-sm: 10px;
    --focus-ring: 0 0 0 3px rgba(166, 117, 75, 0.35);
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif;
    background: var(--bg-base);
    color: var(--ink);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  ::selection {
    background: rgba(166, 117, 75, 0.22);
    color: var(--ink);
  }

  :focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
    border-radius: 4px;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/index.css
git commit -m "feat: actualizar design tokens con paleta de alto contraste y glass ligero"
```

### Task 3: Actualizar clases glass y animaciones en index.css

**Files:**
- Modify: `src/index.css:55-395`

- [ ] **Step 1: Reemplazar todo el bloque `@layer components` desde la linea 55 hasta el final del archivo**

```css
@layer components {
  .bg-stage {
    position: fixed;
    inset: 0;
    overflow: hidden;
    z-index: 0;
    pointer-events: none;
  }

  .orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.25;
    will-change: transform;
  }

  .o1 {
    width: 520px;
    height: 520px;
    background: var(--bg-tint-1);
    top: -10%;
    left: -8%;
    animation: drift1 28s ease-in-out infinite alternate;
  }
  .o2 {
    width: 440px;
    height: 440px;
    background: var(--bg-tint-2);
    bottom: -12%;
    right: -6%;
    animation: drift2 32s ease-in-out infinite alternate;
  }
  .o3 {
    width: 300px;
    height: 300px;
    background: var(--bg-tint-3);
    top: 50%;
    left: 55%;
    animation: drift3 26s ease-in-out infinite alternate;
  }
  .o4 {
    width: 260px;
    height: 260px;
    background: var(--bg-tint-1);
    top: 20%;
    right: 30%;
    animation: drift4 38s ease-in-out infinite alternate;
  }

  .grain {
    position: absolute;
    inset: 0;
    opacity: 0.025;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-repeat: repeat;
    background-size: 128px 128px;
  }

  @keyframes drift1 {
    0%   { transform: translate(0, 0) scale(1); }
    100% { transform: translate(20px, 15px) scale(1.02); }
  }
  @keyframes drift2 {
    0%   { transform: translate(0, 0) scale(1); }
    100% { transform: translate(-18px, -12px) scale(1.03); }
  }
  @keyframes drift3 {
    0%   { transform: translate(0, 0) scale(1); }
    100% { transform: translate(-14px, 20px) scale(1.015); }
  }
  @keyframes drift4 {
    0%   { transform: translate(0, 0) scale(1); }
    100% { transform: translate(16px, -18px) scale(1.025); }
  }

  @keyframes pageIn {
    from { opacity: 0; transform: translateY(6px); filter: blur(2px); }
    to   { opacity: 1; transform: none; }
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: none; }
  }

  /* Glass card ligero */
  .glass {
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur)) saturate(130%);
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(130%);
    border: 1px solid var(--glass-stroke);
    box-shadow: var(--glass-shadow);
    border-radius: var(--radius-lg);
  }

  .glass-hover {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .glass-hover:hover {
    transform: translateY(-1px) scale(1.01);
    box-shadow: 0 2px 8px rgba(30, 20, 10, 0.06);
  }

  .page-in {
    animation: pageIn 350ms ease-out both;
  }

  .stagger > * {
    opacity: 0;
    animation: fadeUp 400ms ease-out forwards;
  }
  .stagger > *:nth-child(1) { animation-delay: 60ms; }
  .stagger > *:nth-child(2) { animation-delay: 120ms; }
  .stagger > *:nth-child(3) { animation-delay: 180ms; }
  .stagger > *:nth-child(4) { animation-delay: 240ms; }
  .stagger > *:nth-child(5) { animation-delay: 300ms; }

  .row-stagger > * {
    opacity: 0;
    animation: fadeUp 350ms ease-out forwards;
  }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 20px;
    border-radius: 10px;
    font-size: 13.5px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    border: none;
    transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
    outline: none;
    min-height: 44px;
    min-width: 44px;
  }
  .btn:focus-visible {
    box-shadow: var(--focus-ring);
  }
  .btn-primary {
    background: linear-gradient(180deg, var(--accent), var(--accent-dark));
    color: #FFFBF5;
    box-shadow: 0 1px 3px rgba(166, 117, 75, 0.25);
  }
  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 3px 10px rgba(166, 117, 75, 0.35);
  }
  .btn-secondary {
    background: transparent;
    color: var(--ink);
    border: 1.5px solid var(--line);
  }
  .btn-secondary:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  .btn-ghost {
    background: transparent;
    color: var(--ink-soft);
  }
  .btn-ghost:hover {
    background: rgba(166, 117, 75, 0.08);
    color: var(--ink);
  }
  .btn-danger {
    background: transparent;
    color: var(--rise);
    border: 1.5px solid rgba(138, 42, 30, 0.20);
  }
  .btn-danger:hover {
    background: rgba(138, 42, 30, 0.06);
  }
  .btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
  }

  /* Segmented control */
  .segmented-track {
    display: inline-flex;
    position: relative;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: rgba(30, 20, 10, 0.03);
    padding: 3px;
  }
  .segmented-pill {
    position: absolute;
    top: 3px;
    bottom: 3px;
    background: #FFFBF5;
    box-shadow: 0 1px 3px rgba(30, 20, 10, 0.08);
    border-radius: 999px;
    transition: transform 0.25s cubic-bezier(0.2, 0.7, 0.2, 1), width 0.25s cubic-bezier(0.2, 0.7, 0.2, 1);
    border: 1px solid rgba(30, 20, 10, 0.06);
  }
  .segmented-option {
    position: relative;
    z-index: 1;
    padding: 7px 16px;
    border-radius: 999px;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--ink-mute);
    cursor: pointer;
    transition: color 0.25s;
    white-space: nowrap;
    background: transparent;
    border: none;
    font-family: inherit;
    min-height: 36px;
  }
  .segmented-option.active {
    color: var(--ink);
  }

  /* Chips */
  .chip {
    display: inline-flex;
    align-items: center;
    background: rgba(30, 20, 10, 0.04);
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 4px 12px;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--ink-soft);
  }
  .chip-accent {
    background: rgba(166, 117, 75, 0.10);
    color: var(--accent-dark);
    border-color: rgba(166, 117, 75, 0.18);
  }

  /* Toggle switch */
  .toggle-track {
    width: 40px;
    height: 24px;
    border-radius: 999px;
    background: rgba(30, 20, 10, 0.10);
    cursor: pointer;
    position: relative;
    transition: background 0.2s;
    border: none;
    padding: 0;
  }
  .toggle-track.on {
    background: var(--sage);
  }
  .toggle-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #FFFBF5;
    position: absolute;
    top: 3px;
    left: 3px;
    transition: transform 0.2s ease;
    box-shadow: 0 1px 2px rgba(0,0,0,.1);
  }
  .toggle-track.on .toggle-thumb {
    transform: translateX(16px);
  }

  /* Input card */
  .input-card {
    border-radius: 12px;
    background: rgba(255, 251, 245, 0.6);
    border: 1px solid var(--line);
    padding: 10px 14px;
    font-size: 14px;
    font-family: inherit;
    color: var(--ink);
    outline: none;
    transition: box-shadow 0.2s, border-color 0.2s;
    width: 100%;
  }
  .input-card:hover {
    border-color: var(--accent);
  }
  .input-card:focus {
    box-shadow: var(--focus-ring);
    border-color: var(--accent);
  }
  .input-card.error {
    border-color: var(--rise);
  }
  .input-card.error:focus {
    box-shadow: 0 0 0 3px rgba(138, 42, 30, 0.25);
  }

  /* Input minimal */
  .input-minimal {
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--line);
    padding: 14px 2px;
    font-size: 14px;
    font-family: inherit;
    color: var(--ink);
    outline: none;
    transition: border-color 0.2s;
    width: 100%;
  }
  .input-minimal:focus {
    border-bottom-color: var(--accent);
  }

  /* Table */
  .table-glass {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  .table-glass th {
    font-weight: 700;
    color: var(--ink-mute);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 10px 14px;
    text-align: left;
    border-bottom: 2px solid var(--line);
    position: sticky;
    top: 0;
    background: var(--bg-base);
    z-index: 1;
  }
  .table-glass td {
    padding: 10px 14px;
    border-bottom: 1px solid var(--line-soft);
  }
  .table-glass tbody tr:nth-child(even) {
    background: rgba(237, 224, 204, 0.30);
  }
  .table-glass tbody tr:hover {
    background: rgba(166, 117, 75, 0.06);
    transform: none;
  }
  .table-glass .cell-positive {
    color: var(--sage-dark);
    background: rgba(93, 122, 74, 0.06);
    border-radius: 6px;
    padding: 2px 8px;
  }
  .table-glass .cell-negative {
    color: var(--rise);
    background: rgba(138, 42, 30, 0.06);
    border-radius: 6px;
    padding: 2px 8px;
  }

  @media (max-width: 640px) {
    .table-glass th {
      padding: 8px 6px;
      font-size: 10px;
      letter-spacing: 0.04em;
    }
    .table-glass td {
      padding: 8px 6px;
      font-size: 12px;
    }
  }

  /* Live indicator */
  .live-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--sage);
    animation: livePulse 2s ease-in-out infinite;
    box-shadow: 0 0 0 0 rgba(93, 122, 74, 0.5);
  }
  @keyframes livePulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(93, 122, 74, 0.4); }
    50%      { box-shadow: 0 0 0 7px rgba(93, 122, 74, 0); }
  }

  /* Eyebrow label */
  .eyebrow {
    font-family: 'Manrope', sans-serif;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.10em;
    color: var(--ink-mute);
  }

  /* Skip to content */
  .skip-link {
    position: absolute;
    top: -100%;
    left: 16px;
    background: var(--ink);
    color: var(--bg-base);
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    z-index: 999;
    text-decoration: none;
  }
  .skip-link:focus {
    top: 16px;
  }

  /* Modal backdrop */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    animation: fadeIn 200ms ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .modal-panel {
    background: var(--bg-base);
    border-radius: var(--radius-lg);
    border: 1px solid var(--line);
    box-shadow: 0 16px 48px rgba(30, 20, 10, 0.12);
    max-width: 90vw;
    max-height: 85vh;
    overflow-y: auto;
    animation: modalIn 200ms ease-out;
  }

  @keyframes modalIn {
    from { opacity: 0; transform: scale(0.95); }
    to   { opacity: 1; transform: scale(1); }
  }

  /* Count-up animation */
  @keyframes countIn {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: none; }
  }
}

@layer utilities {
  .font-num {
    font-variant-numeric: tabular-nums;
  }

  .text-balance {
    text-wrap: balance;
  }

  @media (prefers-reduced-motion: reduce) {
    .page-in, .stagger > *, .row-stagger > * {
      animation: none;
      opacity: 1;
    }
    .orb {
      animation: none;
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/index.css
git commit -m "feat: refinar sistema de componentes CSS con glass ligero y accesibilidad"
```

### Task 4: Verificar que compila tras cambios de CSS

**Files:**
- None (verificacion)

- [ ] **Step 1: Build de verificacion**

```bash
npm run build
```

Expected: build exitoso sin errores.

- [ ] **Step 2: Si el build falla, corregir y volver a commitear**

---

## Fase 2: Layout y Navegacion

### Task 5: Crear componente SkipLink

**Files:**
- Create: `src/components/SkipLink.tsx`
- Modify: `src/App.tsx:62`

- [ ] **Step 1: Crear SkipLink.tsx**

```tsx
export default function SkipLink() {
  return (
    <a href="#main-content" className="skip-link">
      Saltar al contenido
    </a>
  );
}
```

- [ ] **Step 2: Anadir SkipLink en App.tsx, justo despues del div bg-stage**

En `src/App.tsx`, despues del div `.bg-stage`, anadir:

```tsx
<SkipLink />
<div id="main-content" className="relative z-10 min-h-screen" role="main">
```

Y cerrar apropiadamente ese div.

- [ ] **Step 3: Commit**

```bash
git add src/components/SkipLink.tsx src/App.tsx
git commit -m "feat: añadir skip-to-content link para accesibilidad"
```

### Task 6: Crear componente Sidebar (admin)

**Files:**
- Create: `src/components/Sidebar.tsx`
- Create: `src/__tests__/Sidebar.test.tsx`

- [ ] **Step 1: Escribir test para Sidebar**

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

describe('Sidebar', () => {
  it('renders admin and edificio sections', () => {
    const { getByText } = render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );
    expect(getByText('Admin')).toBeInTheDocument();
    expect(getByText('Edificio')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Ejecutar test para verificar que falla**

```bash
npm test -- src/__tests__/Sidebar.test.tsx
```

Expected: FAIL (Sidebar no existe)

- [ ] **Step 3: Crear Sidebar.tsx**

```tsx
import { useNavigate, useLocation } from 'react-router-dom';

interface NavItem {
  label: string;
  path: string;
}

const ADMIN_SECTION: NavItem[] = [
  { label: 'Vecinos', path: '/admin/vecinos' },
  { label: 'Usuarios', path: '/admin/usuarios' },
  { label: 'Aerotermia', path: '/admin/aerotermia' },
];

const EDIFICIO_SECTION: NavItem[] = [
  { label: 'Inicio', path: '/inicio' },
  { label: 'Aerotermia', path: '/aerotermia' },
  { label: 'Juntas', path: '/juntas' },
  { label: 'Contactos', path: '/contactos' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path || (path === '/admin/aerotermia' && location.pathname === path);

  return (
    <aside
      className="hidden md:flex flex-col w-[220px] shrink-0 border-r border-cocoa/6 bg-cream/60 backdrop-blur-sm min-h-screen sticky top-[52px]"
      style={{ height: 'calc(100vh - 52px)' }}
      role="navigation"
      aria-label="Navegación principal"
    >
      <nav className="flex flex-col gap-6 p-4 pt-6">
        <Section label="Admin" items={ADMIN_SECTION} isActive={isActive} onClick={(p) => navigate(p)} />
        <Section label="Edificio" items={EDIFICIO_SECTION} isActive={isActive} onClick={(p) => navigate(p)} />
      </nav>
    </aside>
  );
}

function Section({ label, items, isActive, onClick }: {
  label: string;
  items: NavItem[];
  isActive: (path: string) => boolean;
  onClick: (path: string) => void;
}) {
  return (
    <div>
      <div className="eyebrow px-3 mb-2">{label}</div>
      <ul className="flex flex-col gap-0.5" role="list">
        {items.map((item) => {
          const active = isActive(item.path);
          return (
            <li key={item.path}>
              <button
                onClick={() => onClick(item.path)}
                className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  active
                    ? 'text-cocoa bg-accent/12 font-semibold'
                    : 'text-cocoa/55 hover:text-cocoa hover:bg-cocoa/4'
                }`}
                style={active ? { boxShadow: 'inset 2px 0 0 var(--accent)' } : undefined}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Ejecutar test para verificar que pasa**

```bash
npm test -- src/__tests__/Sidebar.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/Sidebar.tsx src/__tests__/Sidebar.test.tsx
git commit -m "feat: crear sidebar de navegacion para admin"
```

### Task 7: Refactorizar Header (slim + adaptado a sidebar)

**Files:**
- Modify: `src/components/Header.tsx`
- Modify: `src/__tests__/Header.test.tsx` (si existe)

- [ ] **Step 1: Buscar test existente de Header**

```bash
find src -name "*Header*test*" -o -name "*test*Header*" 2>/dev/null
```

- [ ] **Step 2: Reemplazar Header.tsx con version slim**

Leer el archivo actual y reemplazar completamente:

```tsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import Icon from './Icon';
import SelfPasswordModal from './SelfPasswordModal';

const USER_NAV = [
  { label: 'Inicio', path: '/inicio' },
  { label: 'Aerotermia', path: '/aerotermia' },
  { label: 'Juntas', path: '/juntas' },
  { label: 'Contactos', path: '/contactos' },
];

export default function Header() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.is_admin;
  const [open, setOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initials = (user?.vecino_piso || user?.email?.[0] || '?').substring(0, 2).toUpperCase();
  const isActive = (path: string) =>
    location.pathname === path ||
    (path === '/aerotermia' && location.pathname === '/dashboard');

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

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  }, [mobileNavOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-6 border-b border-cocoa/6 bg-cream/80 backdrop-blur-sm"
      style={{ height: '52px' }}
      role="banner"
    >
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/inicio')}
          className="bg-transparent border-none cursor-pointer p-0 shrink-0"
          aria-label="Ir a Inicio"
        >
          <img
            src="/images/elite/Logotipo PNG.png"
            alt="Edificio Elite"
            className="h-7 w-auto"
          />
        </button>

        {!isAdmin && (
          <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label="Navegación principal">
            {USER_NAV.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`text-[11.5px] font-semibold uppercase tracking-[0.05em] px-3 py-1.5 rounded-md transition-colors ${
                  isActive(item.path)
                    ? 'text-cocoa bg-accent/12'
                    : 'text-cocoa/45 hover:text-cocoa hover:bg-cocoa/4'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="md:hidden p-2 rounded-lg text-cocoa/50 hover:text-cocoa bg-transparent border-none cursor-pointer"
          aria-label="Abrir menú"
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          <Icon name="menu" size={20} />
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen(!open)}
            className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[11px] font-bold text-cream border-none cursor-pointer"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))' }}
            aria-label={`Menú de usuario, ${user?.email || ''}`}
            aria-expanded={open}
            aria-haspopup="true"
          >
            {initials}
          </button>

          {open && (
            <div
              className="absolute right-0 top-[38px] z-30 min-w-[200px] py-2 rounded-xl"
              style={{
                background: 'rgba(255,251,245,.97)',
                border: '1px solid var(--glass-stroke)',
                boxShadow: '0 12px 40px rgba(30,20,10,.12)',
              }}
              role="menu"
            >
              <div className="px-4 py-2 text-[11px] text-cocoa/40 border-b border-cocoa/6 font-mono">
                {user?.email}
              </div>
              <button
                onClick={() => { setOpen(false); setShowPasswordModal(true); }}
                className="w-full text-left px-4 py-2.5 text-[13px] text-cocoa/70 hover:text-cocoa hover:bg-accent/5 bg-transparent border-none cursor-pointer font-sans"
                role="menuitem"
              >
                Cambiar contraseña
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-[13px] text-rise hover:bg-rise/5 bg-transparent border-none cursor-pointer font-sans"
                role="menuitem"
              >
                Salir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <>
          <div
            className="fixed inset-0 z-[70] bg-black/25 backdrop-blur-sm md:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <div
            className="fixed left-0 top-0 bottom-0 z-[80] w-[260px] bg-cream border-r border-cocoa/6 p-4 flex flex-col gap-1 md:hidden"
            style={{ animation: 'slideInLeft 250ms ease-out' }}
            role="dialog"
            aria-label="Menú de navegación"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="eyebrow">Menú</span>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="p-2 rounded-lg text-cocoa/50 hover:text-cocoa bg-transparent border-none cursor-pointer"
                aria-label="Cerrar menú"
                style={{ minWidth: '44px', minHeight: '44px' }}
              >
                <Icon name="x" size={18} />
              </button>
            </div>
            {USER_NAV.map((item) => (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setMobileNavOpen(false); }}
                className={`w-full text-left px-3 py-2.5 text-[14px] font-medium rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'text-cocoa bg-accent/12 font-semibold'
                    : 'text-cocoa/55 hover:text-cocoa hover:bg-cocoa/4'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}

      {showPasswordModal && <SelfPasswordModal onClose={() => setShowPasswordModal(false)} />}
    </header>
  );
}
```

- [ ] **Step 3: Anadir keyframe slideInLeft al index.css**

Anadir en `@layer components` de `index.css`:

```css
@keyframes slideInLeft {
  from { transform: translateX(-100%); }
  to   { transform: translateX(0); }
}
```

- [ ] **Step 4: Ejecutar tests de Header si existen**

```bash
npm test -- src/__tests__/Header.test.tsx 2>/dev/null || echo "No Header test found"
```

- [ ] **Step 5: Commit**

```bash
git add src/components/Header.tsx src/index.css
git commit -m "feat: header slim de 52px con drawer movil lateral y accesibilidad"
```

### Task 8: Actualizar App.tsx con layout de sidebar

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Refactorizar App.tsx para envolver paginas autenticadas con layout**

Crear un componente `AuthLayout` dentro de App.tsx que incluya Header + Sidebar condicional:

```tsx
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import LoginPage from './pages/LoginPage';
import InicioPage from './pages/InicioPage';
import DashboardPage from './pages/DashboardPage';
import VecinosPage from './pages/VecinosPage';
import UsuariosPage from './pages/UsuariosPage';
import AdminAerotermiaPage from './pages/AdminAerotermiaPage';
import AdminConsumoPage from './pages/AdminConsumoPage';
import JuntasGeneralesPage from './pages/JuntasGeneralesPage';
import ContactosPage from './pages/ContactosPage';
import RegistroPage from './pages/RegistroPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import SkipLink from './components/SkipLink';
import VersionFooter from './components/VersionFooter';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-cocoa/40 text-sm">Cargando...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !user.is_admin) return <Navigate to="/inicio" replace />;

  return <>{children}</>;
}

function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const isAdmin = user?.is_admin;

  return (
    <>
      <Header />
      <div className="flex">
        {isAdmin && <Sidebar />}
        <main id="main-content" className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </>
  );
}

function Heartbeat() {
  const location = useLocation();
  const heartbeat = useAuthStore((s) => s.heartbeat);

  useEffect(() => {
    heartbeat();
  }, [location, heartbeat]);

  return null;
}

function GuestLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <SkipLink />
      <div className="bg-stage" aria-hidden>
        <div className="orb o1" />
        <div className="orb o2" />
        <div className="orb o3" />
        <div className="orb o4" />
        <div className="grain" />
      </div>
      <div className="relative z-10 min-h-screen">
        <Heartbeat />
        <Routes>
          {/* Guest routes */}
          <Route path="/login" element={<GuestLayout><LoginPage /></GuestLayout>} />
          <Route path="/registro" element={<GuestLayout><RegistroPage /></GuestLayout>} />
          <Route path="/recuperar-contrasena" element={<GuestLayout><ForgotPasswordPage /></GuestLayout>} />
          <Route path="/resetear-contrasena" element={<GuestLayout><ResetPasswordPage /></GuestLayout>} />

          {/* Authenticated routes */}
          <Route path="/inicio" element={<ProtectedRoute><AuthLayout><InicioPage /></AuthLayout></ProtectedRoute>} />
          <Route path="/aerotermia" element={<ProtectedRoute><AuthLayout><DashboardPage /></AuthLayout></ProtectedRoute>} />
          <Route path="/dashboard" element={<Navigate to="/aerotermia" replace />} />
          <Route path="/juntas" element={<ProtectedRoute><AuthLayout><JuntasGeneralesPage /></AuthLayout></ProtectedRoute>} />
          <Route path="/contactos" element={<ProtectedRoute><AuthLayout><ContactosPage /></AuthLayout></ProtectedRoute>} />

          {/* Admin routes */}
          <Route path="/admin" element={<Navigate to="/admin/vecinos" replace />} />
          <Route path="/admin/vecinos" element={<ProtectedRoute adminOnly><AuthLayout><VecinosPage /></AuthLayout></ProtectedRoute>} />
          <Route path="/admin/usuarios" element={<ProtectedRoute adminOnly><AuthLayout><UsuariosPage /></AuthLayout></ProtectedRoute>} />
          <Route path="/admin/aerotermia" element={<ProtectedRoute adminOnly><AuthLayout><AdminAerotermiaPage /></AuthLayout></ProtectedRoute>} />
          <Route path="/admin/vecino/:piso" element={<ProtectedRoute adminOnly><AuthLayout><AdminConsumoPage /></AuthLayout></ProtectedRoute>} />

          <Route path="/" element={<Navigate to="/inicio" replace />} />
          <Route path="*" element={<Navigate to="/inicio" replace />} />
        </Routes>
        <VersionFooter />
      </div>
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: layout con header slim + sidebar admin + skip link"
```

---

## Fase 3: Paginas — quitar Header local

Todas las paginas autenticadas tenian `<Header />` inline. Como ahora Header viene del `AuthLayout`, hay que quitarlo de cada pagina.

### Task 9: Quitar Header de paginas vecino

**Files:**
- Modify: `src/pages/InicioPage.tsx`
- Modify: `src/pages/DashboardPage.tsx`
- Modify: `src/pages/JuntasGeneralesPage.tsx`
- Modify: `src/pages/ContactosPage.tsx`

- [ ] **Step 1: Para cada pagina, quitar el import de Header y el `<Header />` del JSX**

Ejemplo para `InicioPage.tsx`:
- Quitar `import Header from '../components/Header';`
- Quitar `<Header />` del return

Hacer lo mismo en `DashboardPage.tsx`, `JuntasGeneralesPage.tsx`, `ContactosPage.tsx`.

- [ ] **Step 2: Commit**

```bash
git add src/pages/InicioPage.tsx src/pages/DashboardPage.tsx src/pages/JuntasGeneralesPage.tsx src/pages/ContactosPage.tsx
git commit -m "refactor: quitar Header local de paginas vecino, ahora en AuthLayout"
```

### Task 10: Quitar Header de paginas admin

**Files:**
- Modify: `src/pages/VecinosPage.tsx`
- Modify: `src/pages/UsuariosPage.tsx`
- Modify: `src/pages/AdminAerotermiaPage.tsx`
- Modify: `src/pages/AdminConsumoPage.tsx`

- [ ] **Step 1: Para cada pagina, quitar `import Header from '../components/Header';` y `<Header />`**

- [ ] **Step 2: Commit**

```bash
git add src/pages/VecinosPage.tsx src/pages/UsuariosPage.tsx src/pages/AdminAerotermiaPage.tsx src/pages/AdminConsumoPage.tsx
git commit -m "refactor: quitar Header local de paginas admin, ahora en AuthLayout"
```

---

## Fase 4: Componentes — Modales y ConsumoCard

### Task 11: Actualizar todos los modales con nuevo backdrop y animacion

**Files:**
- Modify: `src/components/EditVecinoModal.tsx`
- Modify: `src/components/DeleteVecinoModal.tsx`
- Modify: `src/components/EditUserModal.tsx`
- Modify: `src/components/DeleteUserModal.tsx`
- Modify: `src/components/ChangePasswordModal.tsx`
- Modify: `src/components/SelfPasswordModal.tsx`

- [ ] **Step 1: Actualizar el wrapper de cada modal**

Cada modal usa `createPortal`. Cambiar el wrapper para usar las nuevas clases:

Para cada modal, el div contenedor del portal debe ser:

```tsx
<div className="modal-backdrop" onClick={handleBackdropClick}>
  <div className="modal-panel w-[420px] max-w-[90vw] p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
    {/* ...contenido existente... */}
  </div>
</div>
```

Donde `handleBackdropClick` llama a `onClose`.

Anadir manejo de Escape si no existe ya:

```tsx
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}, [onClose]);
```

- [ ] **Step 2: Commit**

```bash
git add src/components/EditVecinoModal.tsx src/components/DeleteVecinoModal.tsx src/components/EditUserModal.tsx src/components/DeleteUserModal.tsx src/components/ChangePasswordModal.tsx src/components/SelfPasswordModal.tsx
git commit -m "feat: modales con backdrop blur, animacion scale y cierre por Escape"
```

### Task 12: Refinar ConsumoCard con sparklines y count-up

**Files:**
- Modify: `src/components/ConsumoCard.tsx`
- Create: `src/components/Sparkline.tsx`

- [ ] **Step 1: Crear componente Sparkline**

```tsx
import { useMemo } from 'react';

interface SparklineProps {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}

export default function Sparkline({ data, color, width = 80, height = 24 }: SparklineProps) {
  const path = useMemo(() => {
    if (data.length < 2) return '';
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const points = data.map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    });
    return `M${points.join(' L')}`;
  }, [data, width, height]);

  if (data.length < 2) return null;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
```

- [ ] **Step 2: Actualizar ConsumoCard**

Mantener la logica existente de datos, pero actualizar el renderizado:

- Los valores KPI usan `font-display text-[28px]` (antes 32px)
- Las unidades usan `font-mono text-[11px]`
- Anadir sparklines en cada seccion (calor, frio, ACS) cuando haya datos historicos de 7 dias
- El status dot usa la nueva clase `.live-dot` con tooltip

- [ ] **Step 3: Commit**

```bash
git add src/components/Sparkline.tsx src/components/ConsumoCard.tsx
git commit -m "feat: sparklines y count-up en ConsumoCard"
```

---

## Fase 5: Gráficas

### Task 13: Crear tooltip personalizado unificado para Recharts

**Files:**
- Create: `src/components/ChartTooltip.tsx`

- [ ] **Step 1: Crear ChartTooltip.tsx**

```tsx
interface ChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  labelFormatter?: (label: string) => string;
}

export default function ChartTooltip({ active, payload, label, labelFormatter }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: '#FFFBF5',
        border: '1px solid rgba(30,20,10,0.08)',
        borderRadius: '10px',
        padding: '10px 14px',
        boxShadow: '0 4px 16px rgba(30,20,10,0.08)',
        fontSize: '12px',
        fontFamily: "'Manrope', sans-serif",
        color: '#1E140A',
      }}
    >
      {label && (
        <div style={{ fontWeight: 600, marginBottom: 6, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.5 }}>
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      )}
      {payload.map((entry, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
          <span style={{ opacity: 0.7 }}>{entry.name}:</span>
          <span style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ChartTooltip.tsx
git commit -m "feat: tooltip unificado claro para charts Recharts"
```

### Task 14: Actualizar todos los charts con nuevo tooltip, colores y estilos

**Files:**
- Modify: `src/components/HistoricoCharts.tsx`
- Modify: `src/components/FacturasChart.tsx`
- Modify: `src/components/ConsumoVecinosChart.tsx`
- Modify: `src/components/PieChartCard.tsx`
- Modify: `src/components/CopChart.tsx`

- [ ] **Step 1: Actualizar cada chart**

Para cada chart:
1. Importar y usar `ChartTooltip` en vez del tooltip inline
2. Actualizar colores: calor `#B53228`, frio `#4A7A8C`, ACS `#5D7A4A`, fijo `#A6754B`, electrica `#8B6B4A`
3. HistoricoCharts: lineas `strokeWidth={3}`, area con `stopOpacity={0.12}`
4. PieChartCard: `innerRadius="70%"`, anadir texto central con total
5. CopChart: linea principal `#A6754B`, referencia COP=1 con `strokeDasharray="4 4"`
6. Anadir `aria-label` descriptivo a cada chart wrapper

- [ ] **Step 2: Commit**

```bash
git add src/components/HistoricoCharts.tsx src/components/FacturasChart.tsx src/components/ConsumoVecinosChart.tsx src/components/PieChartCard.tsx src/components/CopChart.tsx
git commit -m "feat: refinar todos los charts con tooltip claro y colores saturados"
```

### Task 15: Actualizar Heatmap con nueva escala y tooltips

**Files:**
- Modify: `src/components/HeatmapChart.tsx`

- [ ] **Step 1: Refinar HeatmapChart**

- Cambiar escala de color a una secuencia calida perceptualmente uniforme:
  ```ts
  function heatColor(value: number, max: number): string {
    const t = max > 0 ? Math.min(value / max, 1) : 0;
    const r = Math.round(255 * Math.min(1, t * 1.3));
    const g = Math.round(220 * (1 - t * 0.85));
    const b = Math.round(200 * (1 - t * 0.9));
    return `rgb(${r},${g},${b})`;
  }
  ```
- Anadir `border-radius: 4px` y `gap: 2px` entre celdas
- Anadir `title` attribute con valor exacto en cada celda
- Anadir leyenda de color en la parte inferior

- [ ] **Step 2: Commit**

```bash
git add src/components/HeatmapChart.tsx
git commit -m "feat: heatmap con escala uniforme, bordes redondeados y tooltips"
```

---

## Fase 6: Paginas — Vecinos

### Task 16: Refinar InicioPage

**Files:**
- Modify: `src/pages/InicioPage.tsx`

- [ ] **Step 1: Actualizar InicioPage**

Cambios:
- Titulo: `font-display text-[38px] font-medium` (antes 40px)
- Greeting mas compacto, sin padding-top excesivo
- ConsumoCard ya fue actualizado en Task 12
- InfoCards: glass ligero, icono centrado, texto con mejor espaciado
- Anadir mini resumen "Ultima factura" al final (si hay datos disponibles via API `GET /ultima-factura`)

- [ ] **Step 2: Commit**

```bash
git add src/pages/InicioPage.tsx
git commit -m "feat: refinar InicioPage con layout compacto y ultima factura"
```

### Task 17: Refinar DashboardPage

**Files:**
- Modify: `src/pages/DashboardPage.tsx`

- [ ] **Step 1: Actualizar DashboardPage**

Cambios:
- Layout en 2 columnas para desktop: KPI row arriba, charts (2-col) abajo, facturas full-width
- HA integration card colapsable (usando un estado `showHA`)
- Margenes y padding refinados para sidebar admin

- [ ] **Step 2: Commit**

```bash
git add src/pages/DashboardPage.tsx
git commit -m "feat: layout 2-columnas y HA colapsable en DashboardPage"
```

### Task 18: Refinar JuntasGeneralesPage y ContactosPage

**Files:**
- Modify: `src/pages/JuntasGeneralesPage.tsx`
- Modify: `src/pages/ContactosPage.tsx`

- [ ] **Step 1: Actualizar JuntasGeneralesPage**

- Usar `.table-glass` con las nuevas clases para las tablas
- Anadir badges de estado: "Proxima" (chip-accent), "Celebrada" (chip), "Cancelada" (text-rise)

- [ ] **Step 2: Actualizar ContactosPage**

- Avatar circular con iniciales en gradiente
- Botones de accion (llamar, email) con `btn-secondary` y `min-h-[44px]`
- Layout de tarjeta mas limpio

- [ ] **Step 3: Commit**

```bash
git add src/pages/JuntasGeneralesPage.tsx src/pages/ContactosPage.tsx
git commit -m "feat: refinar Juntas y Contactos con badges y avatares"
```

---

## Fase 7: Paginas — Admin

### Task 19: Refinar VecinosPage

**Files:**
- Modify: `src/pages/VecinosPage.tsx`

- [ ] **Step 1: Actualizar VecinosPage**

Cambios:
- Stats cards con icono y numero grande
- Tabla con `.table-glass` ordenable
- Formulario de crear vecino colapsable con toggle
- Botones de accion con `btn-ghost` + tooltips via `title`
- Toggle switch para `enviar_email`

- [ ] **Step 2: Commit**

```bash
git add src/pages/VecinosPage.tsx
git commit -m "feat: refinar VecinosPage con tabla ordenable y form colapsable"
```

### Task 20: Refinar UsuariosPage

**Files:**
- Modify: `src/pages/UsuariosPage.tsx`

- [ ] **Step 1: Actualizar UsuariosPage**

Cambios:
- Tabla refinada con `.table-glass`
- Toggle switch en vez de checkbox para `is_admin`
- Indicador online con `.live-dot` y texto "Ahora"

- [ ] **Step 2: Commit**

```bash
git add src/pages/UsuariosPage.tsx
git commit -m "feat: refinar UsuariosPage con toggle switch y online indicator"
```

### Task 21: Refinar AdminAerotermiaPage

**Files:**
- Modify: `src/pages/AdminAerotermiaPage.tsx`

- [ ] **Step 1: Actualizar AdminAerotermiaPage**

Cambios:
- Layout reorganizado: KPI row → grid 2-col (Pie + ConsumoVecinos) → HistoricoCharts full → Facturas → COP + Electrica → Heatmap
- Secciones colapsables con un boton toggle
- Breadcrumb: "Admin → Aerotermia"

- [ ] **Step 2: Commit**

```bash
git add src/pages/AdminAerotermiaPage.tsx
git commit -m "feat: reorganizar AdminAerotermia con secciones colapsables"
```

### Task 22: Refinar AdminConsumoPage

**Files:**
- Modify: `src/pages/AdminConsumoPage.tsx`

- [ ] **Step 1: Actualizar AdminConsumoPage**

Cambios:
- Breadcrumb: Admin → Vecinos → Piso {piso}
- KPI cards del vecino con los nuevos estilos
- Usar `useParams` para obtener el piso y mostrarlo en el breadcrumb

- [ ] **Step 2: Commit**

```bash
git add src/pages/AdminConsumoPage.tsx
git commit -m "feat: breadcrumb y KPIs refinados en AdminConsumoPage"
```

---

## Fase 8: Paginas — Auth

### Task 23: Refinar paginas de auth (Login, Registro, Recuperar, Reset)

**Files:**
- Modify: `src/pages/LoginPage.tsx`
- Modify: `src/pages/RegistroPage.tsx`
- Modify: `src/pages/ForgotPasswordPage.tsx`
- Modify: `src/pages/ResetPasswordPage.tsx`

- [ ] **Step 1: Actualizar las 4 paginas de auth**

Para cada pagina:
- Contenedor centrado vertical + horizontal: `min-h-screen flex items-center justify-center`
- Card de auth con clase `.glass` y padding generoso
- Logo mas grande al inicio
- Estados de error con icono de alerta + texto descriptivo
- `autoFocus` en el primer campo del formulario
- Labels superiores claros sobre cada input

- [ ] **Step 2: Commit**

```bash
git add src/pages/LoginPage.tsx src/pages/RegistroPage.tsx src/pages/ForgotPasswordPage.tsx src/pages/ResetPasswordPage.tsx
git commit -m "feat: centrar y refinar paginas de auth con errores descriptivos"
```

---

## Fase 9: Accesibilidad final

### Task 24: Anadir aria-labels a Iconos

**Files:**
- Modify: `src/components/Icon.tsx`

- [ ] **Step 1: Actualizar el componente Icon para aceptar aria-label**

Modificar la funcion `Icon` para que acepte una prop `label` opcional y renderice `aria-label` en el span wrapper:

```tsx
interface IconProps {
  name: string;
  size?: number;
  className?: string;
  label?: string;
}

export default function Icon({ name, size = 20, className = '', label }: IconProps) {
  const svg = ICONS[name];
  if (!svg) return null;
  return (
    <span
      className={className}
      aria-label={label}
      role={label ? 'img' : undefined}
      style={{ display: 'inline-flex', width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Icon.tsx
git commit -m "feat: anadir aria-label a componente Icon"
```

### Task 25: Anadir rol semantico a tablas y secciones

**Files:**
- Modify: `src/pages/AdminAerotermiaPage.tsx`
- Modify: `src/pages/VecinosPage.tsx`
- Modify: `src/pages/UsuariosPage.tsx`

- [ ] **Step 1: Anadir `role="table"`, `role="columnheader"`, `role="row"`, `role="cell"` a tablas**

Para cada tabla que use `<table>`, anadir `role="table"`. Los th ya tienen rol implicito de columnheader. Anadir `scope="col"` a los th.

Anadir `<caption className="sr-only">` a las tablas para lectores de pantalla.

- [ ] **Step 2: Commit**

```bash
git add src/pages/AdminAerotermiaPage.tsx src/pages/VecinosPage.tsx src/pages/UsuariosPage.tsx
git commit -m "fix: roles semanticos en tablas para accesibilidad"
```

---

## Fase 10: Verificacion final

### Task 26: Ejecutar tests, lint y build

**Files:**
- None (verificacion)

- [ ] **Step 1: Ejecutar tests del frontend**

```bash
npm test -- --run
```

Expected: todos los tests pasan.

- [ ] **Step 2: Si hay tests que fallan, corregir**

Posibles fallos: tests que renderizaban `<Header />` directamente sin router. Actualizarlos para wrappear con MemoryRouter o eliminar aserciones sobre el header.

- [ ] **Step 3: Build de verificacion**

```bash
npm run build
```

Expected: build exitoso sin errores de TypeScript.

- [ ] **Step 4: Typecheck backend (verificar que no rompimos nada)**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 5: Commit final**

```bash
git add -A
git commit -m "chore: verificacion final de tests, lint y build"
```

---

## Resumen de commits (26 tasks)

Cada task produce un commit independiente con mensajes en espanol siguiendo conventional commits. El orden es secuencial: cada fase depende de la anterior.
