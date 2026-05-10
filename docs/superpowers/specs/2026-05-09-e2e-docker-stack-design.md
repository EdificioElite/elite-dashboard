# E2E Docker Stack — Diseño

**Fecha:** 2026-05-09
**Estado:** Aprobado
**Alcance:** Stack docker-compose para testing full-stack local con Playwright

---

## Objetivo

Levantar todo el stack (PostgreSQL + API Express + Frontend nginx + Playwright) con datos mock para ejecutar tests E2E que cubran login, dashboard, admin, y casos de error.

## Arquitectura

Un `docker-compose.e2e.yml` con 5 servicios en una red interna. Puertos de API (:3001) y frontend (:5173) expuestos al host para pruebas manuales.

```
 ┌─────────────────────────────────────────────────────────────┐
 │                   docker-compose network                     │
 │                                                             │
 │  ┌──────────┐   ┌──────────┐   ┌──────────────────────┐    │
 │  │ postgres │   │   init   │   │  frontend (nginx)    │    │
 │  │  :5432   │◄──┤ (efímero)│   │  :5173 → host        │    │
 │  │          │   │ migra +  │   │  /api/* proxy → api  │    │
 │  │          │   │ seed SQL │   │  sirve dist/         │    │
 │  └────┬─────┘   └──────────┘   └──────────┬───────────┘    │
 │       │                                   │                  │
 │  ┌────▼─────┐                       ┌─────▼──────┐          │
 │  │   api    │◄──────────────────────│ playwright │          │
 │  │  :3001   │   proxy /api/*        │  (manual)  │          │
 │  │  → host  │                       │  docker run │          │
 │  └──────────┘                       └────────────┘          │
 └─────────────────────────────────────────────────────────────┘
```

### Servicios

| Servicio | Imagen/Build | Puerto host | Dependencias |
|---|---|---|---|
| `postgres` | `postgres:16-alpine` | `5432` | — |
| `init` | `node:22-alpine` (efímero) | — | postgres (healthy) |
| `api` | build `api/Dockerfile` | `3001` | init (completed) |
| `frontend` | build `Dockerfile.frontend` | `5173` | api |
| `playwright` | `mcr.microsoft.com/playwright:latest` | — | frontend + api |

## Datos mock

### Scripts SQL (en `docker/init/`)

1. **`01-n8n-tables.sql`** — Crea tablas gestionadas por n8n:

```sql
vecinos (id SERIAL PK, nombre VARCHAR, piso VARCHAR)
contadores (id SERIAL PK, vecino_id FK→vecinos, codigo VARCHAR)
consumos (id SERIAL PK, contador_id FK→contadores, timestamp TIMESTAMPTZ,
          kwh_electrico NUMERIC(10,3), kwh_acs NUMERIC(10,3))
facturas (id SERIAL PK, vecino_id FK→vecinos, periodo DATE,
          importe NUMERIC(10,2), kwh_electrico NUMERIC(10,2),
          kwh_acs NUMERIC(10,2), created_at TIMESTAMPTZ DEFAULT NOW())
```

2. **`02-seed.sql`** — Datos frescos cada arranque:

- 5 vecinos (pisos 1A-5A)
- 5 contadores (CT-001 a CT-005, uno por vecino)
- ~450 consumos: ~90 lecturas diarias por vecino (3 meses), valores kWh con `generate_series`
- 15 facturas: 3 por vecino (enero, febrero, marzo 2026), importes calculados

3. **`03-seed-users.ts`** — Script Node ejecutado por `init`:
   - Hashea passwords con bcrypt
   - Inserta 5 usuarios: 1 admin + 4 vecinos normales

### Credenciales

| Rol | Email | Password |
|---|---|---|
| Admin | `admin@elite.com` | `admin123` |
| Vecino 1 | `vecino1@elite.com` | `password1` |
| Vecino 2 | `vecino2@elite.com` | `password1` |
| Vecino 3 | `vecino3@elite.com` | `password1` |
| Vecino 4 | `vecino4@elite.com` | `password1` |

## Frontend

- Nuevo `Dockerfile.frontend` multi-stage:
  1. `node:22-alpine` → `npm ci && npm run build` con `VITE_API_URL=/api` (relativa)
  2. `nginx:alpine` → copia `dist/` a `/usr/share/nginx/html` + nginx.conf
- nginx config con SPA fallback (`try_files $uri /index.html`) + reverse proxy `/api/*` → `http://api:3001`
- Expone puerto 80, mapeado a host `:5173`

## Playwright

### Estructura

```
e2e/
├── playwright.config.ts
├── fixtures/
│   └── login.ts          # Helper: login como admin/vecino
└── specs/
    ├── login.spec.ts      # Login exitoso, fallido, rate limiting
    ├── dashboard.spec.ts  # ConsumoCard, gráfico, tabla, rangos, logout
    └── admin.spec.ts      # Lista vecinos, ver consumos, crear usuario, acceso denegado
```

### Casos de test

| Spec | Casos |
|---|---|
| `login.spec.ts` | Login admin exitoso → redirect /admin; login vecino exitoso → /dashboard; login fallido → mensaje error; campos vacíos → error; rate limiting: 3 intentos + 1 → bloqueo |
| `dashboard.spec.ts` | ConsumoCard: ver kWh electricidad y ACS; ConsumoChart: ver título y líneas; cambiar rango (día/semana/mes); FacturasTable: ver filas con periodo/importe; logout vuelve a /login |
| `admin.spec.ts` | Tabla vecinos visible; "Ver consumos" navega a /admin/vecino/:id con gráfico; "Crear usuario" muestra formulario; POST crear usuario exitoso → aparece en tabla; vecino normal accede /admin → redirect a /dashboard |

### Ejecución

```bash
# Levantar stack
docker compose -f docker-compose.e2e.yml up -d --build

# Ejecutar tests
docker compose -f docker-compose.e2e.yml run --rm playwright

# Tirar todo
docker compose -f docker-compose.e2e.yml down -v
```

## Archivos nuevos

| Archivo | Propósito |
|---|---|
| `docker-compose.e2e.yml` | Orquestación de servicios |
| `Dockerfile.frontend` | Build producción frontend + nginx |
| `docker/nginx.conf` | SPA fallback |
| `docker/init/01-n8n-tables.sql` | Schema tablas n8n |
| `docker/init/02-seed.sql` | Datos mock |
| `docker/init/03-seed-users.ts` | Seed usuarios con bcrypt |
| `e2e/playwright.config.ts` | Config Playwright |
| `e2e/fixtures/login.ts` | Helper de autenticación |
| `e2e/specs/login.spec.ts` | Tests de login |
| `e2e/specs/dashboard.spec.ts` | Tests de dashboard |
| `e2e/specs/admin.spec.ts` | Tests de admin |

## Consideraciones

- **VITE_API_URL** se configura como `/api` (ruta relativa). Nginx en el frontend hace proxy inverso de `/api/*` → `http://api:3001/api/*`. Esto funciona idénticamente desde el host (navegador → localhost:5173 → nginx → api:3001) y desde Playwright en Docker (navegador → frontend:5173 → nginx → api:3001). La API también queda expuesta directamente en `:3001` para pruebas manuales con curl/Postman.
- El contenedor `init` es efímero: se ejecuta una vez (`restart: no`) y termina.
- `docker compose down -v` destruye los volúmenes, garantizando datos frescos en cada arranque.
- No se modifica el `api/Dockerfile` existente.
- No se añaden dependencias a `package.json` del proyecto (Playwright es autocontenido en su contenedor).
