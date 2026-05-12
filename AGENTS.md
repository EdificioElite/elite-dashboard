# AGENTS.md

Instrucciones para agentes de IA que trabajen en este proyecto.

## Comandos

### Frontend

```bash
npm install          # Instalar dependencias (raiz del proyecto)
npm run dev          # Servidor de desarrollo Vite (:5173)
npm run build        # Compilar TypeScript + build Vite
npm run preview      # Previsualizar build de produccion
```

### Backend

```bash
cd api && npm install   # Instalar dependencias
cd api && npm run dev   # Servidor de desarrollo con tsx (:3001)
cd api && npm run build # Compilar TypeScript a dist/
cd api && npm run migrate # Ejecutar migraciones SQL
```

### Verificacion

```bash
npm run build                  # Verificar frontend compila
cd api && npx tsc --noEmit     # Verificar backend compila
```

## Convenciones

- TypeScript strict mode en todo el proyecto
- Backend: CommonJS (`module: commonjs`), target ES2022
- Frontend: ESNext con bundler, JSX react-jsx
- Commits en espanol con conventional commits (`feat:`, `fix:`, `docs:`)
- No modificar tablas existentes de n8n (`vecinos`, `contadores`, `consumos`, `facturas`, `facturaelectrica`)
- Solo lectura desde el dashboard, n8n es el unico que escribe datos de consumo/facturas
- Variables de entorno: nunca commitear `.env`, usar `.env.example` como plantilla
- Estilos con Tailwind CSS, no CSS custom
- Tailwind config: `content` incluye `./index.html` y `./src/**/*.{js,ts,jsx,tsx}`

## Testing

```bash
npm test                  # Frontend tests (vitest + @testing-library/react)
cd api && npm test        # Backend tests (vitest + supertest)
```

### Backend (api/src/__tests__/)
- **Unit tests:** JWT helpers, auth/admin/rateLimit middleware
- **Integration tests:** API routes con supertest y DB mockeada
- Ejecutar antes de commit: `cd api && npm test && npx tsc --noEmit`

### Frontend (src/)
- **Component tests:** ConsumoCard, HistoricoCharts, FacturasChart, FacturasTable
- **Store tests:** Zustand auth store
- **Page tests:** LoginPage
- Ejecutar antes de commit: `npm test && npm run build`

### E2E (e2e/)
- **Playwright tests:** login, dashboard, admin, date-range
- Ejecutar con docker: `docker compose -f docker-compose.e2e.yml up -d && docker compose -f docker-compose.e2e.yml --profile test run --rm playwright sh -c "npx playwright test"`
- Las specs usan fixtures en `e2e/fixtures/auth.ts`

## Flujo de trabajo

- **Siempre trabajar en ramas**: `feat/`, `fix/`, `docs/`, `chore/` desde `dev`
- **Siempre crear PR** para mergear a `dev`. Nunca push directo a `dev` ni a `main`.
- **Labels semver** (`major`, `minor`, `patch`) solo se exigen en PRs de `dev` → `main`
- Para promocionar a produccion, ejecutar manualmente el workflow `Promote dev to main`
  - Esto crea automaticamente un PR de `dev` → `main`
  - Asignar label `major`, `minor` o `patch` a ese PR antes de mergearlo
- Tras merge a `main`, el workflow `Sync main to dev` crea automaticamente un PR de `main` → `dev`
  para sincronizar version bumps, hotfixes y releases de vuelta a dev

### Ramas protegidas

`main` y `dev` requieren PR antes de merge y que pasen los checks:
`backend`, `frontend`, `e2e`, `check-labels`

### Entornos

| Rama | Entorno | URL | Backend |
|---|---|---|---|
| `dev` | Preview/Dev | dev.edificioelite.com | api-dev.edificioelite.com |
| `main` | Production | www.edificioelite.com | api.edificioelite.com |

## Debugging / Logs

Si algo falla en los entornos dev o prod, consulta los logs en Grafana (MCP configurado):

- **Grafana**: https://grafana.edificioelite.com
- **Loki datasource UID**: `fepqwwjmv4iyoe`
- **Backend dev**: `{service_name="dashboard-api-dev"}` (compose_project: `elitedashboard-dev`)
- **Buscar errores**: `{service_name="dashboard-api-dev"} |= "error"`

Usa las herramientas `grafana_query_loki_logs`, `grafana_list_loki_label_names`, etc.
NO especules sobre la causa de un fallo sin revisar los logs primero.

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) ejecuta en cada push y PR a `main` y `dev`:
- Backend: typecheck + tests
- Frontend: tests + build
- E2E: stack docker-compose + Playwright

Release (`.github/workflows/release.yml`) se ejecuta en merge a main:
- Solo si el commit empieza por "Merge pull request"
- Bump semver segun label de la PR
- Tag + GitHub Release + Docker image

Promote (`.github/workflows/promote.yml`): workflow_dispatch manual para crear PR de dev → main

Sync (`.github/workflows/sync.yml`): auto back-merge main → dev tras cada release

## Superpowers

- Los planes en `docs/superpowers/plans/` deben eliminarse tras ejecutarlos
- Las specs en `docs/superpowers/specs/` se conservan como documentacion
