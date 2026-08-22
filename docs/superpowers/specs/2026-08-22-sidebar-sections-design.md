# Diseño — Secciones "Edificio" y "Admin" en la barra lateral

Fecha: 2026-08-22

## Contexto

La barra lateral (`src/components/Sidebar.tsx`) y el menú móvil (`src/components/Header.tsx`) muestran las secciones "Edificio" y "Admin" como una etiqueta `eyebrow` seguida de una lista plana de ítems. El usuario considera que el separador entre secciones no se distingue lo suficiente y quiere que cada sección se aprecie como un bloque claro, con el mismo formato en escritorio y en móvil.

## Decisión

Aplicar el estilo **A1**: cada sección dentro de una caja redondeada con fondo y borde sutil, y el título en color (accent para Edificio, azul para Admin) con una línea divisoria fina debajo. Se extrae un componente compartido `NavSection` para que escritorio y móvil usen exactamente el mismo formato.

## Cambios

### `src/components/NavSection.tsx` (nuevo)

- Componente compartido que renderiza una sección de navegación: caja `bg-cocoa/4 border border-cocoa/8 rounded-md p-3`, título `eyebrow` con tono de color y línea divisoria, y lista de ítems.
- Props: `label`, `tone?: 'edificio' | 'admin'` (default `edificio`), `items`, `isActive`, `onSelect`, `itemClassName?` (para ajustar el tamaño de los ítems en móvil).
- Título de sección:
  - `edificio` → `text-accent-dark`
  - `admin` → `text-accent-2`
  - Mantener `eyebrow` (uppercase, 11px, letter-spacing).
  - `border-b border-cocoa/10 pb-2 mb-2` bajo el título.

### `src/components/Sidebar.tsx`

- Sustituir el componente local `Section` por `NavSection`.
- Pasar `tone="edificio"` para la sección Edificio y `tone="admin"` para Admin (esta última solo si `showAdmin`).

### `src/components/Header.tsx` (menú móvil)

- Sustituir el renderizado inline de los ítems por `NavSection`, con el mismo formato que escritorio.
- Orden consistente con escritorio: primero `Edificio`, luego `Admin` (solo si `showAdmin`).
- Ítems móviles con `itemClassName="px-3 py-2.5 text-[14px]"` (mayor área táctil); al pulsar cierran el drawer.
- El estado activo incluye la barra de acento igual que escritorio.

### No se modifica

- `src/lib/nav.ts` sin cambios.
- No se añaden estilos CSS custom; todo con utilidades Tailwind existentes.

## Verificación

- `npm test` (incluye tests `src/__tests__/Sidebar.test.tsx` y `src/components/Header.test.tsx`).
- `npm run build`.
