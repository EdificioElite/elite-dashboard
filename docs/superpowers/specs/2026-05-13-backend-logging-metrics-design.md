# Backend Logging + Prometheus Metrics

## Resumen

Añadir logging estructurado (pino) y endpoint de metricas en formato Prometheus
al backend Express, sin cambios funcionales en las rutas existentes.

## Librerias

| Libreria | Version | Proposito |
|----------|---------|-----------|
| `pino` | ^9.0 | Logger JSON estructurado |
| `pino-http` | ^10.0 | Middleware HTTP request logging |
| `express-prom-bundle` | ^8.0 | Middleware de metricas Prometheus (usa prom-client) |

`express-prom-bundle` incluye `prom-client` como dependencia transitiva.
No hace falta listarla en `package.json`.

## Disenio

### Nuevo archivo: `api/src/lib/logger.ts`

Instancia unica de pino exportada como `logger`. Nivel configurable via
`LOG_LEVEL` (default `info`). Siempre salida JSON.

Todos los `console.log` y `console.error` del backend se reemplazan por
llamadas a `logger.info` y `logger.error`.

### Modificacion: `api/src/index.ts`

Se anaden dos middlewares **antes** de las rutas y **antes** de los middlewares
de auth/cors que ya existen:

1. **`pino-http`**: loguea cada request HTTP con metadata (method, url, query
   params, status code, response time). Ignora OPTIONS (CORS preflight).

2. **`express-prom-bundle`**: expone `GET /metrics` con el formato de
   Prometheus. Sin autenticacion. Normaliza paths dinamicos para evitar
   explosion de series.

El `console.log` del `app.listen` se reemplaza por `logger.info`.

### Metricas expuestas en GET /metrics

| Metrica | Tipo | Descripcion |
|---------|------|-------------|
| `http_request_duration_seconds` | Histogram | Latencia por metodo, path, status |
| `http_requests_total` | Counter | Total de requests (derivado del histogram) |
| `up` | Gauge | 1 si la API responde |
| `process_cpu_user_seconds_total` | Counter | CPU user time |
| `process_heap_bytes` | Gauge | Memoria heap |
| `process_open_fds` | Gauge | File descriptors abiertos |

Las metricas de proceso las anade `prom-client` automaticamente.

### Path normalization

Rutas dinamicas se normalizan para no crear series infinitas:

| Path recibido | Path normalizado |
|---------------|-----------------|
| `/api/admin/vecinos/5` | `/api/admin/vecinos/:piso` |
| `/api/admin/usuarios/3` | `/api/admin/usuarios/:id` |
| `/api/admin/usuarios/3/password` | `/api/admin/usuarios/:id/password` |

El resto de endpoints no tienen path params, se registran tal cual.

### Reemplazo de console.* existentes

Todos los `console.error` y `console.log` del backend se migran a `logger`:

| Archivo | Cambio |
|---------|--------|
| `api/src/index.ts:20` | `console.log` -> `logger.info` |
| `api/src/db.ts:11` | `console.error` -> `logger.error` |
| `api/src/migrate.ts:11,13,17` | `console.log` -> `logger.info` |
| `api/src/migrate.ts:21` | `console.error` -> `logger.error` |
| `api/src/routes/auth.ts:54,122` | `console.error` -> `logger.error` |
| `api/src/routes/consumos.ts:63,132` | `console.error` -> `logger.error` |
| `api/src/routes/facturas.ts:33` | `console.error` -> `logger.error` |
| `api/src/routes/admin.ts:19,80,115,129,179,208,234` | `console.error` -> `logger.error` |

## Archivos afectados

| Archivo | Accion |
|---------|--------|
| `api/package.json` | Anadir 3 dependencias |
| `api/src/lib/logger.ts` | **Nuevo** - instancia pino |
| `api/src/index.ts` | Anadir middlewares pino-http + express-prom-bundle |
| `api/src/db.ts` | Reemplazar console.error |
| `api/src/migrate.ts` | Reemplazar console.log/error |
| `api/src/routes/auth.ts` | Reemplazar console.error |
| `api/src/routes/consumos.ts` | Reemplazar console.error |
| `api/src/routes/facturas.ts` | Reemplazar console.error |
| `api/src/routes/admin.ts` | Reemplazar console.error |

## Entorno

No requiere nuevas variables de entorno. La variable existente `PORT` se sigue usando.
Opcional: `LOG_LEVEL` para controlar el nivel de log (por defecto `info`).

## Verificacion

- `cd api && npm install && npx tsc --noEmit` debe compilar sin errores
- `cd api && npm test` debe pasar todos los tests
- `npm run dev` debe mostrar logs JSON en consola
- `curl http://localhost:3001/metrics` debe devolver metricas en formato Prometheus
- Los middlewares existentes (auth, admin, rateLimit) siguen funcionando igual
