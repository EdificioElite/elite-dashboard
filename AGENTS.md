# AGENTS.md

Instrucciones para agentes de IA que trabajen en este proyecto.

> **Contexto del proyecto:** Ver [README.md](./README.md) para arquitectura, tech stack, estructura del proyecto y guia de despliegue.

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
cd api && npm run migrate # Ejecutar migraciones SQL (solo en local/desarrollo)
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

## Base de datos

- **Migraciones automaticas en los entornos reales (dev y prod):** las ejecuta un init-container (`dashboard-api-migrate` / `dashboard-api-dev-migrate`) que corre `node dist/migrate.js` con los roles dedicados `migrator` (prod) y `migrator_dev` (dev) antes de arrancar la API. Ver [CONTRIBUTING.md](./CONTRIBUTING.md) para el proceso completo.
- **Los archivos de migracion en `api/migrations/` los commitea el agente para que el humano los revise**, igual que antes. El humano solo ejecuta manualmente, una sola vez: (1) crear los roles `migrator` y `migrator_dev` y (2) el baseline de `schema_migrations`.
- `migrate.ts` trackea las migraciones aplicadas en la tabla `schema_migrations` (propiedad de los roles de migracion) y solo aplica las pendientes.
- **Los roles y tablas de n8n (`n8nuser`, `n8n`, `contadores`, `facturas`, `facturaelectrica`, `consumos`) son de otro servicio separado. NO se tocan ni se usan desde el dashboard.** Las tablas de n8n son de solo lectura para el dashboard y n8n es el unico que escribe datos de consumo/facturas.
- La tabla `vecinos` es propiedad del dashboard. `n8nuser` solo tiene lectura sobre ella (relacion de solo lectura ya existente, no se modifica).
- El dashboard es propietario de las tablas `usuarios`, `vecinos`, `email_tokens` y `refresh_tokens`.
- Los cambios de permisos (GRANTs) van en las migraciones — los aplica el init-container con los roles `migrator` / `migrator_dev`.
- Los roles de runtime son `dashboard_api` (prod) y `dashboard_api_dev` (dev), con minimos privilegios. Los roles `migrator` (prod) y `migrator_dev` (dev) son **SUPERUSER** (las migraciones hacen `ALTER OWNER`/`GRANT`/`CREATE ROLE`) y solo se usan para migrar.

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
- Ejecutar con docker: `docker compose -f docker-compose.e2e.yml up -d && docker compose -f docker-compose.e2e.yml --profile test run --rm playwright sh -c "npm install && npx playwright test --project=readonly --workers=4 && npx playwright test --project=stateful --workers=1"`
- Los specs se reparten en dos proyectos: `readonly` (paralelo, `--workers=4`) y `stateful` (serial, muta `vecino1`/emails mock: forgot-password, password-change, directiva). No paralelizar `stateful` con nada.
- Las specs usan fixtures en `e2e/fixtures/auth.ts`

## Flujo de trabajo

Ver [CONTRIBUTING.md](./CONTRIBUTING.md) para las reglas de ramas, PRs, entornos y CI/CD.

Como agente, ademas:
- **Siempre trabajar en ramas** `feat/`, `fix/`, `docs/`, `chore/` desde `main`
- **Siempre crear PR** para mergear a `main`. Nunca push directo a `main`.
- **Siempre verificar que la CI esta en verde** (`gh pr checks`) antes de pedir review humana. Si e2e, backend o frontend fallan, analizar los logs y corregir.
- **Siempre revisar los comentarios de Copilot en el PR** y resolver los issues que señale. Copilot revisa automaticamente cada PR y deja comentarios inline (puede tardar unos minutos). Revisar Copilot despues de la CI, no antes.

## Debugging / Logs

Si algo falla en los entornos dev o prod, consulta los logs en Grafana (MCP configurado):

- **Grafana**: https://grafana.edificioelite.com
- **Loki datasource UID**: `fepqwwjmv4iyoe`
- **Backend dev**: `{service_name="dashboard-api-dev"}` (compose_project: `elitedashboard-dev`)
- **Buscar errores**: `{service_name="dashboard-api-dev"} |= "error"`

Usa las herramientas `grafana_query_loki_logs`, `grafana_list_loki_label_names`, etc.
NO especules sobre la causa de un fallo sin revisar los logs primero.

## Superpowers

- Los planes en `docs/superpowers/plans/` deben eliminarse tras ejecutarlos
- Las specs en `docs/superpowers/specs/` se conservan como documentacion
