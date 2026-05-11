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

- **Siempre trabajar en ramas**: `feat/`, `fix/`, `docs/`, `chore/` desde `main`
- **Siempre crear PR** para mergear a `main`. Nunca push directo a main.
- **Anadir label de versionado** a la PR: `major`, `minor` o `patch`
- El workflow `Release` se ejecuta automaticamente al mergear una PR a main y:
  - Lee el label de la PR para decidir el bump
  - Genera GitHub Release + tag + build Docker
  - Commitea el bump de version en `api/package.json`

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) ejecuta en cada push y PR:
- Backend: typecheck + tests
- Frontend: tests + build
- E2E: stack docker-compose + Playwright

Release (`.github/workflows/release.yml`) se ejecuta en merge a main:
- Solo si el commit empieza por "Merge pull request"
- Bump semver segun label de la PR
- Tag + GitHub Release + Docker image
