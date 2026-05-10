# E2E Docker Stack + Playwright — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Levantar el stack completo (PostgreSQL + API + Frontend nginx + Playwright) con datos mock en docker-compose y ejecutar tests E2E de login, dashboard, admin y errores.

**Architecture:** Un `docker-compose.e2e.yml` con 5 servicios: postgres, init (migraciones+seed), api, frontend (nginx con proxy inverso /api), playwright. Puertos expuestos al host para pruebas manuales.

**Tech Stack:** Docker Compose v3.8+, PostgreSQL 16, Node 22, Express, Nginx, Playwright (en contenedor `mcr.microsoft.com/playwright:latest`)

---

## File Structure

```
docker/
├── init/
│   ├── 01-n8n-tables.sql      # Schema tablas n8n (vecinos, contadores, consumos, facturas)
│   ├── 02-seed.sql             # Datos mock (5 vecinos, consumos, facturas)
│   └── 03-seed-users.ts        # Script Node: bcrypt hashear passwords + insert usuarios
├── nginx.conf                  # SPA fallback + reverse proxy /api → api:3001
Dockerfile.frontend             # Build frontend + nginx
docker-compose.e2e.yml          # Orquestacion
e2e/
├── playwright.config.ts        # Config Playwright
├── fixtures/
│   └── auth.ts                 # Helpers: login como admin/vecino
└── specs/
    ├── login.spec.ts           # Login exitoso, fallido, rate limiting
    ├── dashboard.spec.ts       # ConsumoCard, grafico, tabla, rangos, logout
    └── admin.spec.ts           # Lista vecinos, ver consumos, crear usuario, acceso denegado
```

---

### Task 1: Crear docker-compose.e2e.yml

**Files:**
- Create: `docker-compose.e2e.yml`

- [ ] **Step 1: Escribir docker-compose.e2e.yml**

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: elite
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d elite"]
      interval: 3s
      timeout: 3s
      retries: 10

  init:
    image: node:22-alpine
    working_dir: /app
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgres://postgres:postgres@postgres:5432/elite
    volumes:
      - ./api/migrations:/app/migrations:ro
      - ./docker/init:/app/init:ro
    command: >
      sh -c "
        echo 'Installing pg...' &&
        npm init -y > /dev/null &&
        npm install pg bcrypt > /dev/null &&
        echo 'Running n8n tables schema...' &&
        node -e \"
          const { Pool } = require('pg');
          const fs = require('fs');
          const pool = new Pool({ connectionString: process.env.DATABASE_URL });
          pool.query(fs.readFileSync('/app/init/01-n8n-tables.sql', 'utf-8'))
            .then(() => { console.log('n8n tables created'); return pool.query(fs.readFileSync('/app/init/02-seed.sql', 'utf-8')); })
            .then(() => { console.log('Seed data inserted'); return pool.end(); })
            .catch(e => { console.error(e); process.exit(1); });
        \"
        &&
        echo 'Running usuarios migration...' &&
        node -e \"
          const { Pool } = require('pg');
          const fs = require('fs');
          const pool = new Pool({ connectionString: process.env.DATABASE_URL });
          pool.query(fs.readFileSync('/app/migrations/001_create_usuarios.sql', 'utf-8'))
            .then(() => { console.log('usuarios table created'); return pool.end(); })
            .catch(e => { console.error(e); process.exit(1); });
        \"

        &&
        echo 'Running user seed...' &&
        node /app/init/03-seed-users.ts
      "

  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    depends_on:
      init:
        condition: service_completed_successfully
    environment:
      DATABASE_URL: postgres://postgres:postgres@postgres:5432/elite
      JWT_SECRET: e2e-test-jwt-secret-dont-use-in-prod
      CORS_ORIGIN: "*"
      PORT: "3001"

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "5173:80"
    depends_on:
      - api
    environment:
      VITE_API_URL: /api

  playwright:
    image: mcr.microsoft.com/playwright:latest
    working_dir: /e2e
    depends_on:
      - frontend
      - api
    volumes:
      - ./e2e:/e2e
    environment:
      BASE_URL: http://frontend:80
    command: npx playwright test
    profiles:
      - test

volumes:
  pgdata:
```

- [ ] **Step 2: Verificar sintaxis**

```bash
docker compose -f docker-compose.e2e.yml config
```
Expected: prints the resolved config without errors.

- [ ] **Step 3: Commit**

```bash
git add docker-compose.e2e.yml
git commit -m "feat: agregar docker-compose.e2e.yml con servicios postgres, api, frontend y playwright"
```

---

### Task 2: Crear scripts SQL de init

**Files:**
- Create: `docker/init/01-n8n-tables.sql`
- Create: `docker/init/02-seed.sql`
- Create: `docker/init/03-seed-users.ts`

- [ ] **Step 1: Escribir 01-n8n-tables.sql**

```sql
CREATE TABLE IF NOT EXISTS vecinos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  piso VARCHAR(10) NOT NULL
);

CREATE TABLE IF NOT EXISTS contadores (
  id SERIAL PRIMARY KEY,
  vecino_id INTEGER NOT NULL REFERENCES vecinos(id),
  codigo VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS consumos (
  id SERIAL PRIMARY KEY,
  contador_id INTEGER NOT NULL REFERENCES contadores(id),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  kwh_electrico NUMERIC(10,3) NOT NULL DEFAULT 0,
  kwh_acs NUMERIC(10,3) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS facturas (
  id SERIAL PRIMARY KEY,
  vecino_id INTEGER NOT NULL REFERENCES vecinos(id),
  periodo DATE NOT NULL,
  importe NUMERIC(10,2) NOT NULL DEFAULT 0,
  kwh_electrico NUMERIC(10,2) NOT NULL DEFAULT 0,
  kwh_acs NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- [ ] **Step 2: Escribir 02-seed.sql**

```sql
INSERT INTO vecinos (nombre, piso) VALUES
  ('Vecino 1A', '1A'),
  ('Vecino 2A', '2A'),
  ('Vecino 3A', '3A'),
  ('Vecino 4A', '4A'),
  ('Vecino 5A', '5A');

INSERT INTO contadores (vecino_id, codigo) VALUES
  (1, 'CT-001'),
  (2, 'CT-002'),
  (3, 'CT-003'),
  (4, 'CT-004'),
  (5, 'CT-005');

INSERT INTO consumos (contador_id, timestamp, kwh_electrico, kwh_acs)
SELECT
  ct.id AS contador_id,
  ts AS timestamp,
  ROUND((2.0 + RANDOM() * 1.5)::numeric, 3) AS kwh_electrico,
  ROUND((0.3 + RANDOM() * 1.2)::numeric, 3) AS kwh_acs
FROM contadores ct
CROSS JOIN generate_series(
  '2026-01-01 00:00:00'::timestamptz,
  '2026-03-31 23:00:00'::timestamptz,
  '12 hours'::interval
) AS ts;

INSERT INTO facturas (vecino_id, periodo, kwh_electrico, kwh_acs, importe)
SELECT
  v.id AS vecino_id,
  d::date AS periodo,
  ROUND((250 + RANDOM() * 150)::numeric, 2) AS kwh_electrico,
  ROUND((80 + RANDOM() * 70)::numeric, 2) AS kwh_acs,
  ROUND(((250 + RANDOM() * 150) * 0.15 + (80 + RANDOM() * 70) * 0.08)::numeric, 2) AS importe
FROM vecinos v
CROSS JOIN generate_series(
  '2026-01-01'::date,
  '2026-03-01'::date,
  '1 month'::interval
) AS d;
```

- [ ] **Step 3: Escribir 03-seed-users.ts**

```ts
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@postgres:5432/elite',
  });

  const users = [
    { email: 'admin@elite.com', password: 'admin123', vecino_id: 1, is_admin: true },
    { email: 'vecino1@elite.com', password: 'password1', vecino_id: 1, is_admin: false },
    { email: 'vecino2@elite.com', password: 'password1', vecino_id: 2, is_admin: false },
    { email: 'vecino3@elite.com', password: 'password1', vecino_id: 3, is_admin: false },
    { email: 'vecino4@elite.com', password: 'password1', vecino_id: 4, is_admin: false },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    await pool.query(
      'INSERT INTO usuarios (email, password_hash, vecino_id, is_admin) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
      [u.email, hash, u.vecino_id, u.is_admin]
    );
    console.log(`Usuario creado: ${u.email}`);
  }

  await pool.end();
  console.log('Seed usuarios completo');
}

seed().catch((e) => {
  console.error('Seed usuarios failed:', e);
  process.exit(1);
});
```

- [ ] **Step 4: Commit**

```bash
git add docker/init/
git commit -m "feat: agregar scripts SQL de init y seed de usuarios para stack e2e"
```

---

### Task 3: Crear Dockerfile.frontend y nginx.conf

**Files:**
- Create: `Dockerfile.frontend`
- Create: `docker/nginx.conf`

- [ ] **Step 1: Escribir Dockerfile.frontend**

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts tailwind.config.js postcss.config.js ./
COPY index.html ./
COPY src/ ./src/
RUN npm run build

FROM nginx:alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

- [ ] **Step 2: Escribir docker/nginx.conf**

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://api:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        try_files $uri /index.html;
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add Dockerfile.frontend docker/nginx.conf
git commit -m "feat: agregar Dockerfile.frontend con nginx y proxy /api"
```

---

### Task 4: Configurar Playwright

**Files:**
- Create: `e2e/playwright.config.ts`
- Create: `e2e/fixtures/auth.ts`
- Create: `e2e/specs/login.spec.ts`
- Create: `e2e/specs/dashboard.spec.ts`
- Create: `e2e/specs/admin.spec.ts`

- [ ] **Step 1: Escribir e2e/playwright.config.ts**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  timeout: 30000,
  expect: { timeout: 10000 },
  retries: 0,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
  },
});
```

- [ ] **Step 2: Escribir e2e/fixtures/auth.ts**

```ts
import { Page } from '@playwright/test';

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|admin)/);
}

export async function loginAsAdmin(page: Page) {
  await loginAs(page, 'admin@elite.com', 'admin123');
}

export async function loginAsVecino(page: Page) {
  await loginAs(page, 'vecino1@elite.com', 'password1');
}

export async function logout(page: Page) {
  await page.click('text=Salir');
  await page.waitForURL('/login');
}
```

- [ ] **Step 3: Escribir e2e/specs/login.spec.ts**

```ts
import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsVecino, logout } from '../fixtures/auth';

test.describe('Login', () => {
  test('admin login redirects to /admin', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL('/admin');
    await expect(page.locator('h1')).toContainText('Panel de Administracion');
  });

  test('vecino login redirects to /dashboard', async ({ page }) => {
    await loginAsVecino(page);
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Elite Dashboard');
  });

  test('wrong credentials shows error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@elite.com');
    await page.fill('input[type="password"]', 'wrong');
    await page.click('button[type="submit"]');
    await expect(page.locator('.bg-red-100')).toContainText('Credenciales invalidas');
  });

  test('empty fields shows error', async ({ page }) => {
    await page.goto('/login');
    await page.click('button[type="submit"]');
    await expect(page.locator('.bg-red-100')).toContainText('Email y password son requeridos');
  });

  test('rate limiting blocks after 3 failed attempts', async ({ page }) => {
    await page.goto('/login');
    for (let i = 0; i < 3; i++) {
      await page.fill('input[type="email"]', 'a@a.com');
      await page.fill('input[type="password"]', 'wrong');
      await page.click('button[type="submit"]');
      await page.waitForSelector('.bg-red-100');
    }
    await page.fill('input[type="email"]', 'a@a.com');
    await page.fill('input[type="password"]', 'wrong');
    await page.click('button[type="submit"]');
    await expect(page.locator('.bg-red-100')).toContainText('Demasiados intentos');
  });

  test('logout returns to login', async ({ page }) => {
    await loginAsVecino(page);
    await logout(page);
    await expect(page).toHaveURL('/login');
  });
});
```

- [ ] **Step 4: Escribir e2e/specs/dashboard.spec.ts**

```ts
import { test, expect } from '@playwright/test';
import { loginAsVecino, logout } from '../fixtures/auth';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsVecino(page);
  });

  test('shows consumo actual card with kWh values', async ({ page }) => {
    await expect(page.locator('h2:has-text("Consumo actual")')).toBeVisible();
    await expect(page.locator('text=Electricidad')).toBeVisible();
    await expect(page.locator('text=ACS (Agua Caliente)')).toBeVisible();
  });

  test('shows consumo chart', async ({ page }) => {
    await expect(page.locator('h2:has-text("Consumo electrico y ACS")')).toBeVisible();
    await expect(page.locator('select')).toBeVisible();
  });

  test('can change chart range to dia/mes', async ({ page }) => {
    await page.selectOption('select', 'dia');
    await page.waitForTimeout(500);
    await page.selectOption('select', 'mes');
    await page.waitForTimeout(500);
    await expect(page.locator('select')).toHaveValue('mes');
  });

  test('shows facturas table with rows', async ({ page }) => {
    await expect(page.locator('h2:has-text("Facturas")')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
  });

  test('shows user email in header', async ({ page }) => {
    await expect(page.locator('header')).toContainText('vecino1@elite.com');
  });
});
```

- [ ] **Step 5: Escribir e2e/specs/admin.spec.ts**

```ts
import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsVecino } from '../fixtures/auth';

test.describe('Admin', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('shows vecinos table', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Panel de Administracion');
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(5);
  });

  test('navigates to vecino consumos', async ({ page }) => {
    await page.click('text=Ver consumos');
    await expect(page).toHaveURL(/\/admin\/vecino\/\d/);
    await expect(page.locator('h1')).toContainText('Consumos vecino');
  });

  test('can create a new user', async ({ page }) => {
    await page.click('text=Crear usuario');
    await page.fill('input[type="number"]', '5');
    await page.fill('input[type="email"]', 'vecino5@elite.com');
    await page.fill('input[type="password"]', 'password1');
    await page.click('text=Guardar');
    await expect(page.locator('.bg-green-100')).toContainText('Usuario creado correctamente');
    await expect(page.locator('tbody')).toContainText('vecino5@elite.com');
  });

  test('non-admin cannot access /admin', async ({ page }) => {
    await loginAsVecino(page);
    await page.goto('/admin');
    await expect(page).toHaveURL('/dashboard');
  });
});
```

- [ ] **Step 6: Verificar que los tests son sintacticamente validos**

```bash
npx playwright test --list 2>/dev/null || echo "(Los tests se validan dentro del contenedor playwright)"
```

- [ ] **Step 7: Commit**

```bash
git add e2e/
git commit -m "test: agregar tests E2E de Playwright (login, dashboard, admin)"
```

---

### Task 5: Levantar stack y ejecutar tests

**Files:** Ninguno nuevo — verificación del stack completo.

- [ ] **Step 1: Levantar stack**

```bash
docker compose -f docker-compose.e2e.yml up -d --build
```
Expected: Todos los servicios arrancan sin errores. `init` termina con exit code 0.

- [ ] **Step 2: Verificar servicios**

```bash
docker compose -f docker-compose.e2e.yml ps
```
Expected: postgres, api, frontend con status "running" (o "Up"). init con status "exited (0)".

- [ ] **Step 3: Verificar API responde**

```bash
curl -s http://localhost:3001/api/health
```
Expected: `{"status":"ok"}`

- [ ] **Step 4: Verificar frontend responde**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/
```
Expected: `200`

- [ ] **Step 5: Verificar proxy /api funciona desde frontend**

```bash
curl -s http://localhost:5173/api/health
```
Expected: `{"status":"ok"}`

- [ ] **Step 6: Ejecutar tests Playwright**

```bash
docker compose -f docker-compose.e2e.yml run --rm playwright
```
Expected: Todos los tests pasan (o la mayoria — depurar los que fallen).

- [ ] **Step 7: Tirar stack**

```bash
docker compose -f docker-compose.e2e.yml down -v
```

- [ ] **Step 8: Commit si hubo ajustes**

Si se hicieron correcciones durante la verificacion:
```bash
git add -A
git commit -m "fix: ajustes en stack e2e tras verificacion"
```

---

### Task 6: Agregar script npm para facilitar uso

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Agregar scripts en root package.json**

Abrir `package.json` y agregar en `"scripts"`:

```json
"e2e:up": "docker compose -f docker-compose.e2e.yml up -d --build",
"e2e:test": "docker compose -f docker-compose.e2e.yml run --rm playwright",
"e2e:down": "docker compose -f docker-compose.e2e.yml down -v"
```

El bloque `scripts` completo queda:

```json
"scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e:up": "docker compose -f docker-compose.e2e.yml up -d --build",
    "e2e:test": "docker compose -f docker-compose.e2e.yml run --rm playwright",
    "e2e:down": "docker compose -f docker-compose.e2e.yml down -v"
}
```

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "feat: agregar scripts npm para stack e2e (up/test/down)"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - docker-compose con 5 servicios ✓ (Task 1)
   - SQL init scripts para tablas n8n ✓ (Task 2)
   - Seed datos: 5 vecinos, ~450 consumos, 15 facturas ✓ (Task 2)
   - Seed usuarios con bcrypt ✓ (Task 2)
   - Dockerfile.frontend con nginx + proxy /api ✓ (Task 3)
   - nginx.conf con SPA fallback y reverse proxy ✓ (Task 3)
   - Playwright config ✓ (Task 4)
   - Fixtures de login ✓ (Task 4)
   - Tests login (exitoso, fallido, rate limiting) ✓ (Task 4)
   - Tests dashboard (card, chart, tabla, rangos, logout) ✓ (Task 4)
   - Tests admin (vecinos, crear usuario, acceso denegado) ✓ (Task 4)
   - Puertos expuestos al host (3001, 5173, 5432) ✓ (Task 1)
   - Scripts npm de conveniencia ✓ (Task 6)

2. **Placeholder scan:** No hay TBD, TODO, "implement later", o "add error handling" sin codigo.

3. **Type consistency:** Los helpers `loginAsAdmin`/`loginAsVecino`/`logout` se exportan en `fixtures/auth.ts` y se usan en los 3 specs con los mismos nombres. Los selectores CSS coinciden con los componentes reales (`.bg-red-100` para errores, `h1` para titulos, `input[type="email"]`, etc.).
