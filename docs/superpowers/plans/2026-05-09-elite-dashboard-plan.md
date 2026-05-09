# Elite Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dashboard where building residents can log in and view their aerothermal consumption (historical + current) and monthly invoices, with an admin panel for user management.

**Architecture:** React + Vite frontend deployed on Vercel communicates via Cloudflare Tunnel with a Node.js/Express API running in the existing docker-compose on the local NUC server. The API reads from the existing PostgreSQL (only reads consumos/facturas; n8n handles writes). Auth via JWT with a new `usuarios` table.

**Tech Stack:** TypeScript, Express, pg, bcrypt, jsonwebtoken, React 19, Vite, React Router v6, Recharts, Zustand, Tailwind CSS

---

## File Structure

```
elite-dashboard/
├── api/
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── migrations/
│   │   └── 001_create_usuarios.sql
│   └── src/
│       ├── index.ts
│       ├── config.ts
│       ├── db.ts
│       ├── migrate.ts
│       ├── lib/
│       │   └── jwt.ts
│       ├── middleware/
│       │   ├── auth.ts
│       │   └── admin.ts
│       └── routes/
│           ├── auth.ts
│           ├── consumos.ts
│           ├── facturas.ts
│           └── admin.ts
├── src/                          # Frontend (Vite)
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── api/
│   │   └── client.ts
│   ├── store/
│   │   └── auth.ts
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── AdminPage.tsx
│   │   └── AdminVecinoPage.tsx
│   └── components/
│       ├── ConsumoCard.tsx
│       ├── ConsumoChart.tsx
│       └── FacturasTable.tsx
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── vercel.json
└── .env.example
```

---

### Task 1: Initialize backend project

**Files:**
- Create: `api/package.json`
- Create: `api/tsconfig.json`

- [ ] **Step 1: Create api/package.json**

```json
{
  "name": "elite-api",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "migrate": "tsx src/migrate.ts"
  },
  "dependencies": {
    "bcrypt": "^5.1.1",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.13.1"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/node": "^22.10.0",
    "@types/pg": "^8.11.10",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  }
}
```

- [ ] **Step 2: Create api/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Install dependencies**

```bash
cd api && npm install
```

Expected: node_modules created, no errors

- [ ] **Step 4: Commit**

```bash
git add api/package.json api/tsconfig.json api/package-lock.json
git commit -m "feat: initialize backend project with Express + TypeScript"
```

---

### Task 2: Database connection and config

**Files:**
- Create: `api/src/config.ts`
- Create: `api/src/db.ts`
- Create: `api/.env.example`

- [ ] **Step 1: Create api/.env.example**

```
DATABASE_URL=postgres://user:password@localhost:5432/elite
JWT_SECRET=change-me-to-a-random-string
CORS_ORIGIN=http://localhost:5173
PORT=3001
```

- [ ] **Step 2: Create api/src/config.ts**

```typescript
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/elite',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
```

- [ ] **Step 3: Create api/src/db.ts**

```typescript
import { Pool } from 'pg';
import { config } from './config';

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export async function query(text: string, params?: unknown[]) {
  return pool.query(text, params);
}
```

- [ ] **Step 4: Commit**

```bash
git add api/src/config.ts api/src/db.ts api/.env.example
git commit -m "feat: add database connection and config"
```

---

### Task 3: Database migration (usuarios table)

**Files:**
- Create: `api/migrations/001_create_usuarios.sql`
- Create: `api/src/migrate.ts`

- [ ] **Step 1: Create api/migrations/001_create_usuarios.sql**

```sql
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  vecino_id INTEGER REFERENCES vecinos(id) UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

- [ ] **Step 2: Create api/src/migrate.ts**

```typescript
import fs from 'fs';
import path from 'path';
import { pool } from './db';

async function migrate() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    console.log(`Running migration: ${file}`);
    await pool.query(sql);
    console.log(`Migration ${file} complete`);
  }

  await pool.end();
  console.log('All migrations complete');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

- [ ] **Step 3: Commit**

```bash
git add api/migrations/ api/src/migrate.ts
git commit -m "feat: add usuarios table migration"
```

---

### Task 4: JWT helpers

**Files:**
- Create: `api/src/lib/jwt.ts`

- [ ] **Step 1: Create api/src/lib/jwt.ts**

```typescript
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface JwtPayload {
  userId: number;
  vecinoId: number;
  email: string;
  isAdmin: boolean;
}

const EXPIRATION = '7d';

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: EXPIRATION });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
}
```

- [ ] **Step 2: Commit**

```bash
git add api/src/lib/jwt.ts
git commit -m "feat: add JWT sign and verify helpers"
```

---

### Task 5: Auth middleware

**Files:**
- Create: `api/src/middleware/auth.ts`

- [ ] **Step 1: Create api/src/middleware/auth.ts**

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../lib/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token no proporcionado' });
    return;
  }

  const token = header.slice(7);

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalido o expirado' });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/src/middleware/auth.ts
git commit -m "feat: add JWT auth middleware"
```

---

### Task 6: Admin middleware

**Files:**
- Create: `api/src/middleware/admin.ts`

- [ ] **Step 1: Create api/src/middleware/admin.ts**

```typescript
import { Request, Response, NextFunction } from 'express';

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !req.user.isAdmin) {
    res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador' });
    return;
  }
  next();
}
```

- [ ] **Step 2: Commit**

```bash
git add api/src/middleware/admin.ts
git commit -m "feat: add admin role middleware"
```

---

### Task 7: Auth routes (login, me, health)

**Files:**
- Create: `api/src/routes/auth.ts`
- Create: `api/src/middleware/rateLimit.ts`

- [ ] **Step 1: Create api/src/middleware/rateLimit.ts**

```typescript
import { Request, Response, NextFunction } from 'express';

const attempts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(maxAttempts: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = attempts.get(ip);

    if (!record || now > record.resetAt) {
      attempts.set(ip, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (record.count >= maxAttempts) {
      res.status(429).json({ error: 'Demasiados intentos. Intenta de nuevo en un minuto.' });
      return;
    }

    record.count++;
    next();
  };
}
```

- [ ] **Step 2: Create api/src/routes/auth.ts**

```typescript
import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db';
import { signToken } from '../lib/jwt';
import { authMiddleware } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

router.post('/auth/login', rateLimit(3, 60 * 1000), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email y password son requeridos' });
      return;
    }

    const result = await query(
      'SELECT u.id, u.vecino_id, u.email, u.password_hash, u.is_admin FROM usuarios u WHERE u.email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Credenciales invalidas' });
      return;
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      res.status(401).json({ error: 'Credenciales invalidas' });
      return;
    }

    const token = signToken({
      userId: user.id,
      vecinoId: user.vecino_id,
      email: user.email,
      isAdmin: user.is_admin,
    });

    res.json({
      token,
      user: {
        id: user.id,
        vecino_id: user.vecino_id,
        email: user.email,
        is_admin: user.is_admin,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/auth/me', authMiddleware, (req: Request, res: Response) => {
  res.json({
    id: req.user!.userId,
    vecino_id: req.user!.vecinoId,
    email: req.user!.email,
    is_admin: req.user!.isAdmin,
  });
});

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

export default router;
```

- [ ] **Step 3: Commit**

```bash
git add api/src/routes/auth.ts api/src/middleware/rateLimit.ts
git commit -m "feat: add auth routes with rate limiting"
```

---

### Task 8: Consumos routes

**Files:**
- Create: `api/src/routes/consumos.ts`

- [ ] **Step 1: Create api/src/routes/consumos.ts**

```typescript
import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/consumos', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { desde, hasta } = req.query;
    const vecinoId = req.user!.vecinoId;

    let sql = `
      SELECT c.timestamp, c.kwh_electrico, c.kwh_acs
      FROM consumos c
      JOIN contadores ct ON c.contador_id = ct.id
      WHERE ct.vecino_id = $1
    `;
    const params: unknown[] = [vecinoId];

    if (desde) {
      params.push(desde);
      sql += ` AND c.timestamp >= $${params.length}`;
    }
    if (hasta) {
      params.push(hasta);
      sql += ` AND c.timestamp <= $${params.length}`;
    }

    sql += ' ORDER BY c.timestamp ASC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Consumos error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/consumo-actual', authMiddleware, async (req: Request, res: Response) => {
  try {
    const vecinoId = req.user!.vecinoId;

    const result = await query(
      `SELECT c.timestamp, c.kwh_electrico, c.kwh_acs
       FROM consumos c
       JOIN contadores ct ON c.contador_id = ct.id
       WHERE ct.vecino_id = $1
       ORDER BY c.timestamp DESC
       LIMIT 1`,
      [vecinoId]
    );

    if (result.rows.length === 0) {
      res.json(null);
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Consumo actual error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add api/src/routes/consumos.ts
git commit -m "feat: add consumos routes"
```

---

### Task 9: Facturas routes

**Files:**
- Create: `api/src/routes/facturas.ts`

- [ ] **Step 1: Create api/src/routes/facturas.ts**

```typescript
import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/facturas', authMiddleware, async (req: Request, res: Response) => {
  try {
    const vecinoId = req.user!.vecinoId;
    const { anio } = req.query;

    let sql = `
      SELECT f.id, f.periodo, f.importe, f.kwh_electrico, f.kwh_acs, f.created_at
      FROM facturas f
      WHERE f.vecino_id = $1
    `;
    const params: unknown[] = [vecinoId];

    if (anio) {
      params.push(anio);
      sql += ` AND EXTRACT(YEAR FROM f.periodo) = $${params.length}`;
    }

    sql += ' ORDER BY f.periodo DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Facturas error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add api/src/routes/facturas.ts
git commit -m "feat: add facturas routes"
```

---

### Task 10: Admin routes

**Files:**
- Create: `api/src/routes/admin.ts`

- [ ] **Step 1: Create api/src/routes/admin.ts**

```typescript
import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';

const router = Router();

router.get('/admin/vecinos', authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT v.id, v.nombre, v.piso, u.email, u.is_admin, u.created_at
      FROM vecinos v
      LEFT JOIN usuarios u ON u.vecino_id = v.id
      ORDER BY v.piso
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Admin vecinos error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/admin/vecinos/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { desde, hasta } = req.query;

    let sql = `
      SELECT c.timestamp, c.kwh_electrico, c.kwh_acs
      FROM consumos c
      JOIN contadores ct ON c.contador_id = ct.id
      WHERE ct.vecino_id = $1
    `;
    const params: unknown[] = [id];

    if (desde) {
      params.push(desde);
      sql += ` AND c.timestamp >= $${params.length}`;
    }
    if (hasta) {
      params.push(hasta);
      sql += ` AND c.timestamp <= $${params.length}`;
    }

    sql += ' ORDER BY c.timestamp ASC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Admin vecino consumos error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/admin/usuarios', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { email, password, vecino_id } = req.body;

    if (!email || !password || !vecino_id) {
      res.status(400).json({ error: 'email, password y vecino_id son requeridos' });
      return;
    }

    const password_hash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO usuarios (vecino_id, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, vecino_id, email, is_admin, created_at`,
      [vecino_id, email, password_hash]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'El email o el vecino ya tiene un usuario asignado' });
      return;
    }
    console.error('Admin create user error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add api/src/routes/admin.ts
git commit -m "feat: add admin routes"
```

---

### Task 11: Express app entry point

**Files:**
- Create: `api/src/index.ts`

- [ ] **Step 1: Create api/src/index.ts**

```typescript
import express from 'express';
import cors from 'cors';
import { config } from './config';
import authRoutes from './routes/auth';
import consumosRoutes from './routes/consumos';
import facturasRoutes from './routes/facturas';
import adminRoutes from './routes/admin';

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.use('/api', authRoutes);
app.use('/api', consumosRoutes);
app.use('/api', facturasRoutes);
app.use('/api', adminRoutes);

app.listen(config.port, () => {
  console.log(`API running on port ${config.port}`);
});
```

- [ ] **Step 2: Commit**

```bash
git add api/src/index.ts
git commit -m "feat: add Express app entry point"
```

---

### Task 12: Dockerfile

**Files:**
- Create: `api/Dockerfile`

- [ ] **Step 1: Create api/Dockerfile**

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY migrations/ ./migrations/
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

- [ ] **Step 2: Commit**

```bash
git add api/Dockerfile
git commit -m "feat: add Dockerfile for API"
```

---

### Task 13: Initialize frontend Vite project

**Files:**
- Create: `package.json` (root)
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `src/main.tsx`
- Create: `src/index.css`
- Create: `.env.example`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "elite-dashboard",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^6.28.0",
    "recharts": "^2.13.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.16",
    "typescript": "^5.7.2",
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 2: Create index.html**

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Elite Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

- [ ] **Step 4: Create tsconfig.json**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- [ ] **Step 5: Create tsconfig.app.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
```

- [ ] **Step 6: Create tsconfig.node.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 7: Create src/index.css with Tailwind directives**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 8: Create src/main.tsx (placeholder, will be updated in Task 23)**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 9: Create .env.example**

```
VITE_API_URL=http://localhost:3001/api
```

- [ ] **Step 10: Install dependencies**

```bash
npm install
```

Expected: node_modules created, no errors

- [ ] **Step 11: Initialize Tailwind**

```bash
npx tailwindcss init -p
```

- [ ] **Step 12: Update tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

- [ ] **Step 13: Commit**

```bash
git add package.json package-lock.json index.html vite.config.ts tsconfig*.json src/main.tsx src/index.css .env.example tailwind.config.js postcss.config.js
git commit -m "feat: initialize Vite + React + Tailwind frontend"
```

---

### Task 14: API client

**Files:**
- Create: `src/api/client.ts`

- [ ] **Step 1: Create src/api/client.ts**

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${response.status}`);
  }

  return response.json();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/api/client.ts
git commit -m "feat: add API client with JWT auth header"
```

---

### Task 15: Auth store (Zustand)

**Files:**
- Create: `src/store/auth.ts`

- [ ] **Step 1: Create src/store/auth.ts**

```typescript
import { create } from 'zustand';
import { apiFetch } from '../api/client';

interface User {
  id: number;
  vecino_id: number;
  email: string;
  is_admin: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  loading: true,

  login: async (email: string, password: string) => {
    const data = await apiFetch<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('token', data.token);
    set({ token: data.token, user: data.user });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ loading: false });
      return;
    }
    try {
      const user = await apiFetch<User>('/auth/me');
      set({ user, token, loading: false });
    } catch {
      localStorage.removeItem('token');
      set({ token: null, user: null, loading: false });
    }
  },
}));
```

- [ ] **Step 2: Commit**

```bash
git add src/store/auth.ts
git commit -m "feat: add Zustand auth store"
```

---

### Task 16: LoginPage

**Files:**
- Create: `src/pages/LoginPage.tsx`

- [ ] **Step 1: Create src/pages/LoginPage.tsx**

```tsx
import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const user = useAuthStore.getState().user;
      navigate(user?.is_admin ? '/admin' : '/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm"
      >
        <h1 className="text-2xl font-bold mb-6 text-center">Elite Dashboard</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <label className="block mb-2 text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full mb-4 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="vecino@email.com"
        />

        <label className="block mb-2 text-sm font-medium text-gray-700">
          Contrasena
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full mb-6 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="••••••••"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/LoginPage.tsx
git commit -m "feat: add LoginPage"
```

---

### Task 17: ConsumoCard component

**Files:**
- Create: `src/components/ConsumoCard.tsx`

- [ ] **Step 1: Create src/components/ConsumoCard.tsx**

```tsx
interface ConsumoActual {
  timestamp: string;
  kwh_electrico: number;
  kwh_acs: number;
}

export default function ConsumoCard({ data }: { data: ConsumoActual | null }) {
  if (!data) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="text-gray-500">No hay datos de consumo disponibles</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Consumo actual</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500">Electricidad</p>
          <p className="text-3xl font-bold text-blue-600">
            {Number(data.kwh_electrico).toFixed(2)}
          </p>
          <p className="text-xs text-gray-400">kWh</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">ACS (Agua Caliente)</p>
          <p className="text-3xl font-bold text-orange-500">
            {Number(data.kwh_acs).toFixed(2)}
          </p>
          <p className="text-xs text-gray-400">kWh</p>
        </div>
      </div>
      <p className="mt-4 text-xs text-gray-400">
        Actualizado: {new Date(data.timestamp).toLocaleString('es-ES')}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ConsumoCard.tsx
git commit -m "feat: add ConsumoCard component"
```

---

### Task 18: ConsumoChart component

**Files:**
- Create: `src/components/ConsumoChart.tsx`

- [ ] **Step 1: Create src/components/ConsumoChart.tsx**

```tsx
import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface Consumo {
  timestamp: string;
  kwh_electrico: number;
  kwh_acs: number;
}

type Range = 'dia' | 'semana' | 'mes';

export default function ConsumoChart({ data }: { data: Consumo[] }) {
  const [range, setRange] = useState<Range>('semana');

  const filtered = useMemo(() => {
    if (data.length === 0) return [];
    const now = new Date(data[data.length - 1].timestamp);
    const cutoffs: Record<Range, Date> = {
      dia: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      semana: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      mes: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    };
    return data.filter(
      (d) => new Date(d.timestamp) >= cutoffs[range]
    );
  }, [data, range]);

  const formatted = useMemo(
    () =>
      filtered.map((d) => ({
        ...d,
        timestamp: new Date(d.timestamp).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          hour: range === 'dia' ? '2-digit' : undefined,
          minute: range === 'dia' ? '2-digit' : undefined,
        }),
      })),
    [filtered, range]
  );

  if (data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="text-gray-500">No hay datos para mostrar</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-700">
          Consumo electrico y ACS
        </h2>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as Range)}
          className="px-3 py-1 border border-gray-300 rounded text-sm"
        >
          <option value="dia">Hoy</option>
          <option value="semana">Semana</option>
          <option value="mes">Mes</option>
        </select>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="kwh_electrico"
            name="Electricidad"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="kwh_acs"
            name="ACS"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ConsumoChart.tsx
git commit -m "feat: add ConsumoChart component"
```

---

### Task 19: FacturasTable component

**Files:**
- Create: `src/components/FacturasTable.tsx`

- [ ] **Step 1: Create src/components/FacturasTable.tsx**

```tsx
interface Factura {
  id: number;
  periodo: string;
  importe: number;
  kwh_electrico: number;
  kwh_acs: number;
}

export default function FacturasTable({ data }: { data: Factura[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Facturas</h2>
        <p className="text-gray-500">No hay facturas disponibles</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Facturas</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50">
            <tr>
              <th className="px-4 py-2">Periodo</th>
              <th className="px-4 py-2">kWh Elec.</th>
              <th className="px-4 py-2">kWh ACS</th>
              <th className="px-4 py-2">Importe</th>
            </tr>
          </thead>
          <tbody>
            {data.map((f) => (
              <tr key={f.id} className="border-b">
                <td className="px-4 py-2">
                  {new Date(f.periodo).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                  })}
                </td>
                <td className="px-4 py-2">{Number(f.kwh_electrico).toFixed(2)}</td>
                <td className="px-4 py-2">{Number(f.kwh_acs).toFixed(2)}</td>
                <td className="px-4 py-2 font-medium">{Number(f.importe).toFixed(2)} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/FacturasTable.tsx
git commit -m "feat: add FacturasTable component"
```

---

### Task 20: DashboardPage

**Files:**
- Create: `src/pages/DashboardPage.tsx`

- [ ] **Step 1: Create src/pages/DashboardPage.tsx**

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { apiFetch } from '../api/client';
import ConsumoCard from '../components/ConsumoCard';
import ConsumoChart from '../components/ConsumoChart';
import FacturasTable from '../components/FacturasTable';

interface Consumo {
  timestamp: string;
  kwh_electrico: number;
  kwh_acs: number;
}

interface Factura {
  id: number;
  periodo: string;
  importe: number;
  kwh_electrico: number;
  kwh_acs: number;
}

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [consumoActual, setConsumoActual] = useState<Consumo | null>(null);
  const [consumos, setConsumos] = useState<Consumo[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [actual, historico, facturasData] = await Promise.all([
          apiFetch<Consumo | null>('/consumo-actual'),
          apiFetch<Consumo[]>('/consumos'),
          apiFetch<Factura[]>('/facturas'),
        ]);
        setConsumoActual(actual);
        setConsumos(historico);
        setFacturas(facturasData);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Elite Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.email}</span>
          {user?.is_admin && (
            <button
              onClick={() => navigate('/admin')}
              className="text-sm text-blue-600 hover:underline"
            >
              Admin
            </button>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 hover:underline"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        <ConsumoCard data={consumoActual} />
        <ConsumoChart data={consumos} />
        <FacturasTable data={facturas} />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/DashboardPage.tsx
git commit -m "feat: add DashboardPage"
```

---

### Task 21: AdminPage

**Files:**
- Create: `src/pages/AdminPage.tsx`

- [ ] **Step 1: Create src/pages/AdminPage.tsx**

```tsx
import { useEffect, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';

interface Vecino {
  id: number;
  nombre: string;
  piso: string;
  email: string | null;
  is_admin: boolean;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [vecinos, setVecinos] = useState<Vecino[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [vecinoId, setVecinoId] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  useEffect(() => {
    apiFetch<Vecino[]>('/admin/vecinos')
      .then(setVecinos)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    try {
      await apiFetch('/admin/usuarios', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          vecino_id: parseInt(vecinoId, 10),
        }),
      });
      setFormSuccess('Usuario creado correctamente');
      setEmail('');
      setPassword('');
      setVecinoId('');
      setShowForm(false);
      const updated = await apiFetch<Vecino[]>('/admin/vecinos');
      setVecinos(updated);
    } catch (err: any) {
      setFormError(err.message || 'Error al crear usuario');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Panel de Administracion</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-blue-600 hover:underline"
          >
            Ver mi dashboard
          </button>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="text-sm text-red-600 hover:underline"
        >
          Salir
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Vecinos</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            {showForm ? 'Cancelar' : 'Crear usuario'}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleCreateUser}
            className="bg-white p-6 rounded-lg shadow-md space-y-4"
          >
            {formError && (
              <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{formError}</div>
            )}
            {formSuccess && (
              <div className="p-3 bg-green-100 text-green-700 rounded text-sm">{formSuccess}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vecino ID
              </label>
              <input
                type="number"
                value={vecinoId}
                onChange={(e) => setVecinoId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contrasena
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            >
              Guardar
            </button>
          </form>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Piso</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Accion</th>
              </tr>
            </thead>
            <tbody>
              {vecinos.map((v) => (
                <tr key={v.id} className="border-b">
                  <td className="px-4 py-3 text-gray-500">{v.id}</td>
                  <td className="px-4 py-3 font-medium">{v.piso}</td>
                  <td className="px-4 py-3">{v.email || 'Sin usuario'}</td>
                  <td className="px-4 py-3">
                    {v.is_admin ? (
                      <span className="text-green-600">Si</span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/admin/vecino/${v.id}`)}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      Ver consumos
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/AdminPage.tsx
git commit -m "feat: add AdminPage"
```

---

### Task 22: AdminVecinoPage

**Files:**
- Create: `src/pages/AdminVecinoPage.tsx`

- [ ] **Step 1: Create src/pages/AdminVecinoPage.tsx**

```tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import ConsumoChart from '../components/ConsumoChart';

interface Consumo {
  timestamp: string;
  kwh_electrico: number;
  kwh_acs: number;
}

export default function AdminVecinoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [consumos, setConsumos] = useState<Consumo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Consumo[]>(`/admin/vecinos/${id}`)
      .then(setConsumos)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm p-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/admin')}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Volver
        </button>
        <h1 className="text-xl font-bold text-gray-800">Consumos vecino #{id}</h1>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        <ConsumoChart data={consumos} />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/AdminVecinoPage.tsx
git commit -m "feat: add AdminVecinoPage"
```

---

### Task 23: App.tsx with React Router

**Files:**
- Create: `src/App.tsx`

- [ ] **Step 1: Create src/App.tsx**

```tsx
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import AdminVecinoPage from './pages/AdminVecinoPage';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !user.is_admin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/vecino/:id"
          element={
            <ProtectedRoute adminOnly>
              <AdminVecinoPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add App with React Router and protected routes"
```

---

### Task 24: Vercel configuration and final wiring

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Create vercel.json**

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

- [ ] **Step 2: Build and verify frontend compiles**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors in `dist/`

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "feat: add Vercel config and verify frontend build"
```
