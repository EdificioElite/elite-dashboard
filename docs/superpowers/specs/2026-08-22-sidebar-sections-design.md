# Diseño — Secciones "Edificio" y "Admin" en la barra lateral

Fecha: 2026-08-22

## Contexto

La barra lateral (`src/components/Sidebar.tsx`) muestra las secciones "Edificio" y "Admin" como una etiqueta `eyebrow` seguida de una lista plana de ítems. El usuario considera que el separador entre secciones no se distingue lo suficiente y quiere que cada sección se aprecie como un bloque claro.

## Decisión

Aplicar el estilo **A1**: cada sección dentro de una caja redondeada con fondo y borde sutil, y el título en color (accent para Edificio, azul para Admin) con una línea divisoria fina debajo.

## Cambios

### `src/components/Sidebar.tsx`

- Añadir un prop `tone: 'edificio' | 'admin'` al componente `Section`.
- Envolver el contenido de cada sección en un contenedor con `bg-cocoa/4 border border-cocoa/8 rounded-md p-3`.
- Título de sección:
  - `edificio` → `text-accent-dark`
  - `admin` → `text-accent-2`
  - Mantener `eyebrow` (uppercase, 11px, letter-spacing).
  - Añadir `border-b border-cocoa/10 pb-2 mb-2` bajo el título.
- Pasar `tone="edificio"` para la sección Edificio y `tone="admin"` para Admin.
- El resto (ítems, estado activo con acento) permanece igual.

### No se modifica

- `src/components/Header.tsx` (menú móvil) queda sin cambios.
- `src/lib/nav.ts` sin cambios.
- No se añaden estilos CSS custom; todo con utilidades Tailwind existentes.

## Verificación

- `npm test` (test existente `src/__tests__/Sidebar.test.tsx` sigue pasando).
- `npm run build`.
