# Modo aerotermia (calefaccion/refrigeracion)

**Fecha:** 2026-05-24
**Estado:** aprobado

## Objetivo

Añadir deteccion automatica del modo de funcionamiento de la aerotermia (calefaccion / refrigeracion / desconocido) en base a la temperatura de impulsion, y mostrar el modo en el dashboard de vivienda ("En Vivo").

## Reglas de negocio

| `temp_impulsion` | Modo            |
|------------------|-----------------|
| `> 29`           | `calefaccion`   |
| `< 21`           | `refrigeracion` |
| `21..29` o null  | `desconocido`   |

## Cambios

### Backend (`api/src/routes/consumos.ts`)

- Endpoint `GET /consumo-actual`: añadir campo `modo` al response, calculado segun las reglas anteriores a partir de `temp_impulsion`.

### Frontend

- `ConsumoCard.tsx`:
  - Añadir `modo` al interface `ConsumoActual`.
  - En la columna "Estado", añadir una linea encima de Impulsion/Retorno que muestre el modo.
  - Colores:
    - `calefaccion` → `text-red-600`
    - `refrigeracion` → `text-blue-600`
    - `desconocido` → `text-gray-400`

## No se modifica

- Grid layout del ConsumoCard
- Endpoints de datos historicos (`/consumos`)
- Admin dashboard
- Tipos compartidos (se mantienen definidos localmente por componente)
