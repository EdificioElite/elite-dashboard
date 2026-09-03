# Ordenación de la tabla de Usuarios

## Objetivo

En la página de administración de Usuarios (`UsuariosPage`), la tabla debe
mostrarse **ordenada por piso por defecto** y permitir al usuario **cambiar la
columna de ordenación haciendo clic sobre su cabecera**.

## Contexto

- La tabla se renderiza en `src/pages/UsuariosPage.tsx` y se alimenta de
  `apiFetch<Usuario[]>('/admin/usuarios')` (ya trae todos los usuarios, por lo
  que la ordenación es 100 % cliente, sin cambios de backend).
- El campo `vecino_piso` es un string con formato `<número><letra>` (`0A`, `0B`,
  `1A`, `3B`, …) o `null` cuando el usuario no tiene piso asignado (se muestra
  como `—`).
- No hay valores especiales tipo "Bajo" o "Ático".

## Requisitos

1. Orden por defecto: **piso ascendente**, con los usuarios sin piso (`null`)
   los primeros.
2. Columnas clicables para ordenar: **Email, Piso, Rol, Estado y Últ. conexión**
   (la columna Acciones no es ordenable).
3. Al hacer clic en una cabecera se alterna entre ascendente y descendente. Un
   indicador visual (flecha) muestra la dirección activa.
4. La ordenación se aplica sobre el resultado ya filtrado por la búsqueda.

## Criterios de ordenación por columna

- **Piso:** usuarios sin piso (`null`) primero. El resto por prefijo numérico
  ascendente y, a igual número, por la letra (`0A`, `0B`, `1A`, `3B`, …).
- **Email:** `localeCompare` sin distinción de mayúsculas.
- **Rol:** prioridad `admin` → `directiva` → `usuario`.
- **Estado:** online/offline (derivado de `ultima_conexion` < 5 min).
- **Últ. conexión:** por fecha; `null` al final.

## Implementación

- Añadir estado `sortKey: SortKey | null` y `sortDir: 'asc' | 'desc'`, con
  `sortKey = 'piso'` y `sortDir = 'asc'` por defecto.
- Calcular `filtered` (búsqueda) y luego `sorted` con `useMemo`, aplicando un
  comparador por columna.
- Extraer un helper para el comparador de piso (prefijo numérico + sufijo).
- Convertir las cabeceras ordenables en botones accesibles (manteniendo
  `scope="col"`) que actualizan `sortKey`/`sortDir`, con una flecha que indica
  la dirección activa.
- Usar estilos Tailwind existentes; no añadir CSS custom.

## Testing

- Añadir/ampliar test de `UsuariosPage` que verifique:
  - Orden por defecto por piso (sin piso primero, luego numérico+letra).
  - Clic en una cabecera cambia la ordenación (p. ej. Email).

## Fuera de alcance

- Cambios en el backend o en la API (`/admin/usuarios`).
- Ordenación/paginación en servidor.
