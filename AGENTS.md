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

Ver [CONTRIBUTING.md](./CONTRIBUTING.md) para las reglas de ramas, PRs, entornos y CI/CD.

Como agente, ademas:
- **Siempre trabajar en ramas** `feat/`, `fix/`, `docs/`, `chore/` desde `dev`
- **Siempre crear PR** para mergear a `dev`. Nunca push directo a `dev` ni a `main`.
- **Siempre revisar los comentarios de Copilot en el PR** y resolver los issues que señale antes de pedir review humana. Copilot revisa automaticamente cada PR y deja comentarios inline.

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
