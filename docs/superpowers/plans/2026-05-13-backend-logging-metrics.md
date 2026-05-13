# Backend Logging + Prometheus Metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add JSON structured logging (pino) and Prometheus metrics endpoint to the backend API.

**Architecture:** Two Express middlewares added to index.ts — pino-http for request logging and express-prom-bundle for Prometheus metrics at GET /metrics. A single pino logger instance replaces all console.* calls across the codebase.

**Tech Stack:** pino, pino-http, express-prom-bundle (uses prom-client internally)

---

### Task 1: Create logger instance

**Files:**
- Create: `api/src/lib/logger.ts`

- [ ] **Step 1: Write logger.ts**

```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});
```

- [ ] **Step 2: Commit**

```bash
git add api/src/lib/logger.ts
git commit -m "feat: add pino logger instance"
```

---

### Task 2: Add dependencies

**Files:**
- Modify: `api/package.json`

- [ ] **Step 1: Add deps to package.json**

Edit `api/package.json`, adding to `"dependencies"`:

```json
"express-prom-bundle": "^8.0.0",
"pino": "^9.0.0",
"pino-http": "^10.0.0"
```

- [ ] **Step 2: Install dependencies**

```bash
cd api && npm install
```

- [ ] **Step 3: Commit**

```bash
git add api/package.json api/package-lock.json
git commit -m "feat: add pino, pino-http, express-prom-bundle deps"
```

---

### Task 3: Add logging and metrics middlewares to index.ts

**Files:**
- Modify: `api/src/index.ts`

- [ ] **Step 1: Replace index.ts**

```typescript
import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import promBundle from 'express-prom-bundle';
import { config } from './config';
import { logger } from './lib/logger';
import authRoutes from './routes/auth';
import consumosRoutes from './routes/consumos';
import facturasRoutes from './routes/facturas';
import adminRoutes from './routes/admin';

const app = express();

app.use(pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => req.method === 'OPTIONS',
  },
}));

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.use(promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  metricsPath: '/metrics',
  normalizePath: [
    [/^\/api\/admin\/vecinos\/[^/]+$/, '/api/admin/vecinos/:piso'],
    [/^\/api\/admin\/usuarios\/\d+$/, '/api/admin/usuarios/:id'],
    [/^\/api\/admin\/usuarios\/\d+\/password$/, '/api/admin/usuarios/:id/password'],
  ],
  autoregister: false,
}));

app.use('/api', authRoutes);
app.use('/api', consumosRoutes);
app.use('/api', facturasRoutes);
app.use('/api', adminRoutes);

app.listen(config.port, () => {
  logger.info({ port: config.port }, 'API running');
});
```

- [ ] **Step 2: Commit**

```bash
git add api/src/index.ts
git commit -m "feat: add pino-http request logging and prometheus metrics middleware"
```

---

### Task 4: Replace console.log/error in db.ts

**Files:**
- Modify: `api/src/db.ts`

- [ ] **Step 1: Replace console.error with logger.error**

Edit `api/src/db.ts`:

Add import:
```typescript
import { logger } from './lib/logger';
```

Replace line 11:
```typescript
// Before:
  console.error('Unexpected error on idle client', err);
// After:
  logger.error(err, 'Unexpected error on idle client');
```

- [ ] **Step 2: Commit**

```bash
git add api/src/db.ts
git commit -m "feat: replace console.error with logger in db.ts"
```

---

### Task 5: Replace console.log/error in migrate.ts

**Files:**
- Modify: `api/src/migrate.ts`

- [ ] **Step 1: Replace all console calls with logger**

Edit `api/src/migrate.ts`:

Add import:
```typescript
import { logger } from './lib/logger';
```

Replace lines 11, 13, 17, 21:

```typescript
// Before:
    console.log(`Running migration: ${file}`);
// After:
    logger.info(`Running migration: ${file}`);

// Before:
    console.log(`Migration ${file} complete`);
// After:
    logger.info(`Migration ${file} complete`);

// Before:
  console.log('All migrations complete');
// After:
  logger.info('All migrations complete');

// Before:
  console.error('Migration failed:', err);
// After:
  logger.error(err, 'Migration failed');
```

- [ ] **Step 2: Commit**

```bash
git add api/src/migrate.ts
git commit -m "feat: replace console with logger in migrate.ts"
```

---

### Task 6: Replace console.error in routes/auth.ts

**Files:**
- Modify: `api/src/routes/auth.ts`

- [ ] **Step 1: Replace console.error calls**

Edit `api/src/routes/auth.ts`:

Add import:
```typescript
import { logger } from '../lib/logger';
```

Replace lines 54 and 122:

```typescript
// Before (line 54):
    console.error('Login error:', err);
// After:
    logger.error(err, 'Login error');

// Before (line 122):
    console.error('Change password error:', err);
// After:
    logger.error(err, 'Change password error');
```

- [ ] **Step 2: Commit**

```bash
git add api/src/routes/auth.ts
git commit -m "feat: replace console.error with logger in auth routes"
```

---

### Task 7: Replace console.error in routes/consumos.ts

**Files:**
- Modify: `api/src/routes/consumos.ts`

- [ ] **Step 1: Replace console.error calls**

Edit `api/src/routes/consumos.ts`:

Add import:
```typescript
import { logger } from '../lib/logger';
```

Replace lines 63 and 132:

```typescript
// Before (line 63):
    console.error('Consumos error:', err);
// After:
    logger.error(err, 'Consumos error');

// Before (line 132):
    console.error('Consumo actual error:', err);
// After:
    logger.error(err, 'Consumo actual error');
```

- [ ] **Step 2: Commit**

```bash
git add api/src/routes/consumos.ts
git commit -m "feat: replace console.error with logger in consumos routes"
```

---

### Task 8: Replace console.error in routes/facturas.ts

**Files:**
- Modify: `api/src/routes/facturas.ts`

- [ ] **Step 1: Replace console.error call**

Edit `api/src/routes/facturas.ts`:

Add import:
```typescript
import { logger } from '../lib/logger';
```

Replace line 33:

```typescript
// Before:
    console.error('Facturas error:', err);
// After:
    logger.error(err, 'Facturas error');
```

- [ ] **Step 2: Commit**

```bash
git add api/src/routes/facturas.ts
git commit -m "feat: replace console.error with logger in facturas routes"
```

---

### Task 9: Replace console.error in routes/admin.ts

**Files:**
- Modify: `api/src/routes/admin.ts`

- [ ] **Step 1: Replace all console.error calls**

Edit `api/src/routes/admin.ts`:

Add import:
```typescript
import { logger } from '../lib/logger';
```

Replace all 7 console.error calls:

```typescript
// Before (line 19):
    console.error('Admin vecinos error:', err);
// After:
    logger.error(err, 'Admin vecinos error');

// Before (line 80):
    console.error('Admin vecino consumos error:', err);
// After:
    logger.error(err, 'Admin vecino consumos error');

// Before (line 115):
    console.error('Admin create user error:', err);
// After:
    logger.error(err, 'Admin create user error');

// Before (line 129):
    console.error('Admin list users error:', err);
// After:
    logger.error(err, 'Admin list users error');

// Before (line 179):
    console.error('Admin update user error:', err);
// After:
    logger.error(err, 'Admin update user error');

// Before (line 208):
    console.error('Admin change password error:', err);
// After:
    logger.error(err, 'Admin change password error');

// Before (line 234):
    console.error('Admin delete user error:', err);
// After:
    logger.error(err, 'Admin delete user error');
```

- [ ] **Step 2: Commit**

```bash
git add api/src/routes/admin.ts
git commit -m "feat: replace console.error with logger in admin routes"
```

---

### Task 10: Verify build and tests

**Files:** None (verification only)

- [ ] **Step 1: Typecheck backend**

```bash
cd api && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 2: Run backend tests**

```bash
cd api && npm test
```
Expected: All tests pass.

- [ ] **Step 3: Commit (if any test fixes needed)**

```bash
git add <fixed files> && git commit -m "fix: adjustments for logger/metrics integration"
```
