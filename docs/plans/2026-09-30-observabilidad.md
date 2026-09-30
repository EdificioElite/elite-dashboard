# Observabilidad del dashboard: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir métricas custom (logins, resets, descargas, etc.), logs con email/usuario redactando datos sensibles, arreglar el scrape de Alloy y crear un dashboard de Grafana.

**Architecture:** Módulo `api/src/lib/metrics.ts` con counters de `prom-client` sobre el registry por defecto (compartido con `express-prom-bundle`, que ya expone `/metrics`). Logs explícitos con contexto en los handlers de auth/admin/descargas. Fix de sintaxis en `config.alloy` de `elite-portainer-compose`. Dashboard JSON en `grafana/observabilidad.json` importado vía MCP.

**Tech Stack:** TypeScript (backend), prom-client 15, pino + pino-http, Grafana Alloy (HCL), Prometheus, Grafana.

**Repos:** `elite-dashboard` (PR2: métricas + logging + dashboard) y `elite-portainer-compose` (PR1: fix Alloy).

---

## PR1 — `elite-portainer-compose`

### Task 1: Arreglar sintaxis de scrape en `config.alloy`

**Files:**
- Modify: `monitoring/config/config.alloy:123-143`

- [ ] **Step 1: Corregir los dos bloques `prometheus.scrape`**

Sustituir la sección "DASHBOARD API METRICS" (líneas 123-143) por:

```alloy
// SECTION: DASHBOARD API METRICS

prometheus.scrape "dashboard_api_dev" {
  scrape_interval = "30s"
  targets = [{
    __address__ = "dashboard-api-dev:3001",
    env         = "dev",
  }]
  metrics_path = "/metrics"
  forward_to = [prometheus.remote_write.default.receiver]
}

prometheus.scrape "dashboard_api" {
  scrape_interval = "30s"
  targets = [{
    __address__ = "dashboard-api:3001",
    env         = "prod",
  }]
  metrics_path = "/metrics"
  forward_to = [prometheus.remote_write.default.receiver]
}

// !SECTION
```

La clave es la **coma final** tras cada campo del objeto literal `{ ... }` (era el error `missing ',' in field list`).

- [ ] **Step 2: Validar sintaxis**

Run: `docker run --rm -v "$(pwd)/monitoring/config/config.alloy:/etc/alloy/config.alloy" grafana/alloy:v1.18.0 fmt /etc/alloy/config.alloy`
Expected: el comando formatea el fichero sin error (o imprime el contenido formateado). Si hay error de sintaxis, `alloy fmt` falla.

- [ ] **Step 3: Commit**

```bash
git add monitoring/config/config.alloy
git commit -m "fix(alloy): arreglar sintaxis del scrape de dashboard-api (coma final + label env)"
```

- [ ] **Step 4 (post-deploy): Verificar scrape**

Tras desplegar en Portainer, en Grafana/Prometheus comprobar:
- `up{job=~"dashboard_api.*"} == 1` para `dashboard_api` y `dashboard_api_dev`.
- `http_requests_total{job="dashboard_api"}` empieza a tener datos.

---

## PR2 — `elite-dashboard`

### Task 2: Añadir `prom-client` y crear `metrics.ts`

**Files:**
- Modify: `api/package.json` (dependencia)
- Create: `api/src/lib/metrics.ts`
- Test: `api/src/__tests__/metrics.test.ts`

- [ ] **Step 1: Instalar dependencia**

Run: `cd api && npm install prom-client@^15.1.3`
Expected: `prom-client` aparece en `dependencies` de `api/package.json`.

- [ ] **Step 2: Escribir el test de fallo**

Crear `api/src/__tests__/metrics.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { register } from 'prom-client';
import {
  loginsTotal,
  passwordResetRequestsTotal,
  facturasDescargasTotal,
} from '../lib/metrics';

describe('metrics', () => {
  beforeEach(() => {
    register.resetMetrics();
  });

  it('incrementa el contador de logins con labels', () => {
    loginsTotal.inc({ outcome: 'success', reason: '' });
    loginsTotal.inc({ outcome: 'failure', reason: 'invalid_credentials' });

    const values = loginsTotal.get().values;
    expect(values).toHaveLength(2);
    expect(
      values.find((v) => v.labels.outcome === 'failure' && v.labels.reason === 'invalid_credentials')?.value
    ).toBe(1);
  });

  it('incrementa el contador de solicitudes de reset con email_found', () => {
    passwordResetRequestsTotal.inc({ email_found: 'true' });

    const values = passwordResetRequestsTotal.get().values;
    expect(values.find((v) => v.labels.email_found === 'true')?.value).toBe(1);
  });

  it('incrementa el contador de descargas de facturas con scope', () => {
    facturasDescargasTotal.inc({ scope: 'admin' });

    const values = facturasDescargasTotal.get().values;
    expect(values.find((v) => v.labels.scope === 'admin')?.value).toBe(1);
  });
});
```

- [ ] **Step 3: Ejecutar test para verificar que falla**

Run: `cd api && npx vitest run src/__tests__/metrics.test.ts`
Expected: FAIL — `Cannot find module '../lib/metrics'`.

- [ ] **Step 4: Implementar `metrics.ts`**

Crear `api/src/lib/metrics.ts`:

```ts
import { Counter, register } from 'prom-client';

export const loginsTotal = new Counter({
  name: 'dashboard_logins_total',
  help: 'Total de intentos de login',
  labelNames: ['outcome', 'reason'],
});

export const registrationsTotal = new Counter({
  name: 'dashboard_registrations_total',
  help: 'Total de registros de usuarios',
  labelNames: ['outcome'],
});

export const passwordResetRequestsTotal = new Counter({
  name: 'dashboard_password_reset_requests_total',
  help: 'Total de solicitudes de reset de contraseña',
  labelNames: ['email_found'],
});

export const passwordResetsTotal = new Counter({
  name: 'dashboard_password_resets_total',
  help: 'Total de resets de contraseña completados',
  labelNames: ['outcome', 'reason'],
});

export const refreshTokensTotal = new Counter({
  name: 'dashboard_refresh_tokens_total',
  help: 'Total de refrescos de token',
  labelNames: ['outcome'],
});

export const logoutsTotal = new Counter({
  name: 'dashboard_logouts_total',
  help: 'Total de cierres de sesión',
});

export const verifyTokensTotal = new Counter({
  name: 'dashboard_verify_tokens_total',
  help: 'Total de verificaciones de token de email',
  labelNames: ['outcome'],
});

export const invitesTotal = new Counter({
  name: 'dashboard_invites_total',
  help: 'Total de invitaciones enviadas',
  labelNames: ['outcome'],
});

export const adminUsersTotal = new Counter({
  name: 'dashboard_admin_users_total',
  help: 'Total de acciones de admin sobre usuarios',
  labelNames: ['action', 'outcome'],
});

export const adminVecinosTotal = new Counter({
  name: 'dashboard_admin_vecinos_total',
  help: 'Total de acciones de admin sobre vecinos',
  labelNames: ['action', 'outcome'],
});

export const juntasTotal = new Counter({
  name: 'dashboard_juntas_total',
  help: 'Total de acciones sobre actas de juntas',
  labelNames: ['action', 'outcome'],
});

export const facturasDescargasTotal = new Counter({
  name: 'dashboard_facturas_descargas_total',
  help: 'Total de descargas de facturas',
  labelNames: ['scope'],
});

export const juntasDescargasTotal = new Counter({
  name: 'dashboard_juntas_descargas_total',
  help: 'Total de descargas de actas de juntas',
});

export { register };
```

- [ ] **Step 5: Ejecutar test para verificar que pasa**

Run: `cd api && npx vitest run src/__tests__/metrics.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
cd api && git add package.json package-lock.json src/lib/metrics.ts src/__tests__/metrics.test.ts
git commit -m "feat(metrics): añadir métricas custom de prom-client"
```

### Task 3: Redacción de datos sensibles en `logger.ts`

**Files:**
- Modify: `api/src/lib/logger.ts`

- [ ] **Step 1: Añadir `redact` al logger**

Sustituir el contenido de `api/src/lib/logger.ts` por:

```ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'password',
      'password_hash',
      'token',
      'refresh_token',
      'refreshToken',
      'authorization',
      'cookie',
    ],
    censor: '[REDACTED]',
  },
});
```

- [ ] **Step 2: Verificar compilación**

Run: `cd api && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
cd api && git add src/lib/logger.ts
git commit -m "feat(logging): redactar campos sensibles en los logs"
```

### Task 4: Instrumentar `auth.ts` (métricas + logs)

**Files:**
- Modify: `api/src/routes/auth.ts`

Los cambios por handler se listan a continuación. Cada sub-paso modifica una parte del fichero. El `import` de métricas va al principio del fichero.

- [ ] **Step 1: Añadir imports**

Tras la línea `import { sendResetEmail } from '../lib/email';` (o al final de los imports de auth.ts), añadir:

```ts
import {
  loginsTotal,
  registrationsTotal,
  passwordResetRequestsTotal,
  passwordResetsTotal,
  refreshTokensTotal,
  logoutsTotal,
  verifyTokensTotal,
} from '../lib/metrics';
```

- [ ] **Step 2: Instrumentar `POST /auth/login`**

Sustituir el handler completo `router.post('/auth/login', ...)` por:

```ts
router.post('/auth/login', rateLimitOnlyOnFailure(5, 60 * 1000), async (req: Request, res: Response) => {
  try {
    const { email, password, source } = req.body;

    if (!email || !password) {
      loginsTotal.inc({ outcome: 'failure', reason: 'missing_credentials' });
      logger.warn({ email: email ?? null, reason: 'missing_credentials' }, 'Login failed');
      res.status(400).json({ error: 'Email y password son requeridos' });
      return;
    }

    const result = await query(
      'SELECT u.id, u.vecino_piso, u.email, u.password_hash, u.role FROM usuarios u WHERE u.email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      loginsTotal.inc({ outcome: 'failure', reason: 'not_found' });
      logger.warn({ email, reason: 'not_found' }, 'Login failed');
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      loginsTotal.inc({ outcome: 'failure', reason: 'invalid_credentials' });
      logger.warn({ email, reason: 'invalid_credentials' }, 'Login failed');
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    await query('UPDATE usuarios SET ultima_conexion = NOW() WHERE id = $1', [user.id]);

    const token = signToken({
      userId: user.id,
      vecinoPiso: user.vecino_piso,
      email: user.email,
      role: user.role,
      source,
    });

    const refreshToken = await createRefreshToken(user.id);

    loginsTotal.inc({ outcome: 'success', reason: '' });
    logger.info({ email }, 'Login successful');

    res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        vecino_piso: user.vecino_piso,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    loginsTotal.inc({ outcome: 'failure', reason: 'server_error' });
    logger.error({ err, email: req.body?.email ?? null }, 'Login error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
```

- [ ] **Step 3: Instrumentar `POST /auth/refresh`**

Sustituir el handler completo `router.post('/auth/refresh', ...)` por:

```ts
router.post('/auth/refresh', rateLimit(30, 60 * 1000), async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken || typeof refreshToken !== 'string') {
      refreshTokensTotal.inc({ outcome: 'failure' });
      res.status(400).json({ error: 'Refresh token requerido' });
      return;
    }

    const rotated = await rotateRefreshToken(refreshToken);
    if (!rotated) {
      refreshTokensTotal.inc({ outcome: 'failure' });
      res.status(401).json({ error: 'Sesión expirada, inicia sesión de nuevo' });
      return;
    }

    const result = await query(
      'SELECT id, vecino_piso, email, role FROM usuarios WHERE id = $1',
      [rotated.userId]
    );
    if (result.rows.length === 0) {
      refreshTokensTotal.inc({ outcome: 'failure' });
      res.status(401).json({ error: 'Usuario no encontrado' });
      return;
    }

    const user = result.rows[0];
    const token = signToken({
      userId: user.id,
      vecinoPiso: user.vecino_piso,
      email: user.email,
      role: user.role,
    });

    refreshTokensTotal.inc({ outcome: 'success' });

    res.json({
      token,
      refreshToken: rotated.refreshToken,
      user: {
        id: user.id,
        vecino_piso: user.vecino_piso,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    refreshTokensTotal.inc({ outcome: 'failure' });
    logger.error({ err }, 'Refresh error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
```

- [ ] **Step 4: Instrumentar `POST /auth/logout`**

Sustituir el handler completo `router.post('/auth/logout', ...)` por:

```ts
router.post('/auth/logout', rateLimit(30, 60 * 1000), async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken && typeof refreshToken === 'string') {
      await revokeRefreshToken(refreshToken);
    }
    logoutsTotal.inc();
  } catch (err) {
    logger.error({ err }, 'Logout error');
  }
  res.json({ message: 'Sesión cerrada' });
});
```

- [ ] **Step 5: Instrumentar `GET /auth/verify-token`**

Sustituir el handler completo `router.get('/auth/verify-token', ...)` por:

```ts
router.get('/auth/verify-token', rateLimitOnError(20, 60 * 1000), async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      verifyTokensTotal.inc({ outcome: 'failure' });
      res.status(400).json({ error: 'Token requerido' });
      return;
    }
    const result = await query(
      `SELECT email, piso, type, expires_at, used_at FROM email_tokens WHERE token_hash = $1`,
      [hashToken(token)]
    );
    if (result.rows.length === 0) {
      verifyTokensTotal.inc({ outcome: 'failure' });
      res.status(400).json({ error: 'Token inválido' });
      return;
    }
    const row = result.rows[0];
    if (row.used_at) {
      verifyTokensTotal.inc({ outcome: 'failure' });
      res.status(400).json({ error: 'Token ya usado' });
      return;
    }
    if (new Date() > new Date(row.expires_at)) {
      verifyTokensTotal.inc({ outcome: 'failure' });
      res.status(400).json({ error: 'Token expirado' });
      return;
    }
    verifyTokensTotal.inc({ outcome: 'success' });
    res.json({ email: row.email, piso: row.piso, type: row.type });
  } catch (err) {
    verifyTokensTotal.inc({ outcome: 'failure' });
    logger.error({ err }, 'Verify token error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
```

- [ ] **Step 6: Instrumentar `POST /auth/register`**

Sustituir el handler completo `router.post('/auth/register', ...)` por:

```ts
router.post('/auth/register', rateLimitOnError(20, 60 * 1000), async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      registrationsTotal.inc({ outcome: 'failure' });
      res.status(400).json({ error: 'Token y contraseña son requeridos' });
      return;
    }
    const pwdError = validatePassword(password);
    if (pwdError) {
      registrationsTotal.inc({ outcome: 'failure' });
      res.status(400).json({ error: pwdError });
      return;
    }
    const tokenData = await verifyEmailToken(token, 'invite');
    if (!tokenData) {
      registrationsTotal.inc({ outcome: 'failure' });
      res.status(400).json({ error: 'Token inválido, expirado o ya usado' });
      return;
    }
    const password_hash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO usuarios (vecino_piso, email, password_hash) VALUES ($1, $2, $3) RETURNING id, vecino_piso, email, role`,
      [tokenData.piso, tokenData.email, password_hash]
    );
    await markTokenUsed(tokenData.id);
    const user = result.rows[0];
    const jwtToken = signToken({
      userId: user.id,
      vecinoPiso: user.vecino_piso,
      email: user.email,
      role: user.role,
    });
    const refreshToken = await createRefreshToken(user.id);

    registrationsTotal.inc({ outcome: 'success' });
    logger.info({ email: user.email, piso: user.vecino_piso }, 'User registered');

    res.json({ token: jwtToken, refreshToken, user });
  } catch (err) {
    registrationsTotal.inc({ outcome: 'failure' });
    logger.error({ err }, 'Register error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
```

- [ ] **Step 7: Instrumentar `POST /auth/forgot-password`**

Sustituir el handler completo `router.post('/auth/forgot-password', ...)` por:

```ts
router.post('/auth/forgot-password', rateLimit(6, 15 * 60 * 1000), async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email requerido' });
      return;
    }
    const result = await query('SELECT id, email FROM usuarios WHERE email = $1', [email]);
    const emailFound = result.rows.length > 0;
    if (emailFound) {
      const token = await createEmailToken(email, 'reset');
      await sendResetEmail(email, token);
    }
    passwordResetRequestsTotal.inc({ email_found: emailFound ? 'true' : 'false' });
    logger.info({ email, emailFound }, 'Forgot password requested');
    res.json({ message: 'Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña' });
  } catch (err) {
    logger.error({ err, email: req.body?.email ?? null }, 'Forgot password error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
```

- [ ] **Step 8: Instrumentar `POST /auth/reset-password`**

Sustituir el handler completo `router.post('/auth/reset-password', ...)` por:

```ts
router.post('/auth/reset-password', rateLimit(10, 15 * 60 * 1000), async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      passwordResetsTotal.inc({ outcome: 'failure', reason: 'invalid_token' });
      res.status(400).json({ error: 'Token y contraseña son requeridos' });
      return;
    }
    const pwdError = validatePassword(password);
    if (pwdError) {
      passwordResetsTotal.inc({ outcome: 'failure', reason: 'weak_password' });
      res.status(400).json({ error: pwdError });
      return;
    }
    const tokenData = await verifyEmailToken(token, 'reset');
    if (!tokenData) {
      passwordResetsTotal.inc({ outcome: 'failure', reason: 'invalid_token' });
      res.status(400).json({ error: 'Token inválido, expirado o ya usado' });
      return;
    }
    const password_hash = await bcrypt.hash(password, 12);
    await query('UPDATE usuarios SET password_hash = $1 WHERE email = $2', [password_hash, tokenData.email]);
    await markTokenUsed(tokenData.id);

    passwordResetsTotal.inc({ outcome: 'success', reason: '' });
    logger.info({ email: tokenData.email }, 'Password reset successful');

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    passwordResetsTotal.inc({ outcome: 'failure', reason: 'server_error' });
    logger.error({ err }, 'Reset password error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
```

- [ ] **Step 9: Verificar compilación y tests existentes**

Run: `cd api && npx tsc --noEmit && npx vitest run src/__tests__/routes.test.ts`
Expected: sin errores de compilación y los tests existentes de auth siguen pasando.

- [ ] **Step 10: Commit**

```bash
cd api && git add src/routes/auth.ts
git commit -m "feat(metrics,logging): instrumentar rutas de auth con métricas y logs"
```

### Task 5: Instrumentar `admin.ts` (métricas + logs)

**Files:**
- Modify: `api/src/routes/admin.ts`

- [ ] **Step 1: Añadir imports**

Tras la línea `import { sendInviteEmail } from '../lib/email';` añadir:

```ts
import { adminUsersTotal, adminVecinosTotal, invitesTotal } from '../lib/metrics';
```

- [ ] **Step 2: Instrumentar `POST /admin/vecinos` (create)**

En el handler `POST /admin/vecinos`, justo antes de `res.status(201).json(result.rows[0]);` añadir:

```ts
    adminVecinosTotal.inc({ action: 'create', outcome: 'success' });
```

Y en el catch, tras el bloque `if (err.code === '23505') { ... }`, en la rama de error genérico (antes de `logger.error`), añadir:

```ts
    adminVecinosTotal.inc({ action: 'create', outcome: 'failure' });
```

Además, en la validación `if (!piso) { res.status(400)...; return; }`, añadir antes del return:

```ts
      adminVecinosTotal.inc({ action: 'create', outcome: 'failure' });
```

- [ ] **Step 3: Instrumentar `PUT /admin/vecinos/:piso` (update)**

Antes de `res.json(result.rows[0]);` (éxito) añadir `adminVecinosTotal.inc({ action: 'update', outcome: 'success' });`. En el `404` y en el catch añadir `adminVecinosTotal.inc({ action: 'update', outcome: 'failure' });`.

- [ ] **Step 4: Instrumentar `DELETE /admin/vecinos/:piso` (delete)**

Antes de `res.json({ message: 'Vecino eliminado correctamente' });` añadir `adminVecinosTotal.inc({ action: 'delete', outcome: 'success' });`. En el `404` y el catch añadir `adminVecinosTotal.inc({ action: 'delete', outcome: 'failure' });`.

- [ ] **Step 5: Instrumentar `POST /admin/usuarios` (invite por email)**

Antes de `res.json({ message: 'Invitación enviada correctamente' });` añadir:

```ts
    invitesTotal.inc({ outcome: 'success' });
    logger.info({ email }, 'Invite sent');
```

En el catch añadir `invitesTotal.inc({ outcome: 'failure' });` y cambiar el `logger.error` a `logger.error({ err, email: req.body?.email ?? null }, 'Admin invite user error');`.

- [ ] **Step 6: Instrumentar `POST /admin/invitar` (invite por piso)**

Antes de `res.json({ message: 'Invitación enviada correctamente' });` añadir:

```ts
    invitesTotal.inc({ outcome: 'success' });
    logger.info({ email: vecino.email, piso: vecino.piso }, 'Invite sent');
```

En el catch añadir `invitesTotal.inc({ outcome: 'failure' });`.

- [ ] **Step 7: Instrumentar `PUT /admin/usuarios/:id` (update)**

Antes de `res.json(result.rows[0]);` añadir `adminUsersTotal.inc({ action: 'update', outcome: 'success' });`. En el catch (tanto la rama `23505` como la genérica) añadir `adminUsersTotal.inc({ action: 'update', outcome: 'failure' });`. Cambiar el `logger.error` del catch genérico a `logger.error({ err, id }, 'Admin update user error');`.

- [ ] **Step 8: Instrumentar `PUT /admin/usuarios/:id/password` (change_password)**

Antes de `res.json({ message: 'Contraseña actualizada' });` añadir `adminUsersTotal.inc({ action: 'change_password', outcome: 'success' });`. En el `400` y `404` y catch añadir `adminUsersTotal.inc({ action: 'change_password', outcome: 'failure' });`.

- [ ] **Step 9: Instrumentar `DELETE /admin/usuarios/:id` (delete)**

Antes de `res.json({ message: 'Usuario eliminado' });` añadir `adminUsersTotal.inc({ action: 'delete', outcome: 'success' });`. En el `400`, `404` y catch añadir `adminUsersTotal.inc({ action: 'delete', outcome: 'failure' });`.

- [ ] **Step 10: Verificar compilación y tests**

Run: `cd api && npx tsc --noEmit && npx vitest run src/__tests__/routes.test.ts`
Expected: sin errores.

- [ ] **Step 11: Commit**

```bash
cd api && git add src/routes/admin.ts
git commit -m "feat(metrics,logging): instrumentar rutas de admin con métricas y logs"
```

### Task 6: Instrumentar descargas y juntas (`facturas.ts`, `adminAerotermia.ts`, `juntas.ts`)

**Files:**
- Modify: `api/src/routes/facturas.ts`
- Modify: `api/src/routes/adminAerotermia.ts`
- Modify: `api/src/routes/juntas.ts`

- [ ] **Step 1: `facturas.ts` — descarga de factura de vecino**

Añadir import:

```ts
import { facturasDescargasTotal } from '../lib/metrics';
```

En `GET /facturas/:id_factura/descargar`, justo antes de `const stream = await getPDFStream(factura.drive_file_id);` añadir:

```ts
    facturasDescargasTotal.inc({ scope: 'user' });
```

- [ ] **Step 2: `adminAerotermia.ts` — descarga de factura admin**

Añadir import:

```ts
import { facturasDescargasTotal } from '../lib/metrics';
```

En `GET /admin/aerotermia/facturas/:id_factura/descargar`, justo antes de `const stream = await getPDFStream(factura.drive_file_id);` añadir:

```ts
    facturasDescargasTotal.inc({ scope: 'admin' });
```

- [ ] **Step 3: `juntas.ts` — descarga de acta**

Añadir import:

```ts
import { juntasDescargasTotal, juntasTotal } from '../lib/metrics';
```

En `GET /juntas/:id`, justo antes de `const stream = await getPDFStream(junta.drive_file_id);` añadir:

```ts
    juntasDescargasTotal.inc();
```

- [ ] **Step 4: `juntas.ts` — CRUD de juntas**

En `POST /admin/juntas`, antes de `res.status(201).json(result.rows[0]);` añadir `juntasTotal.inc({ action: 'create', outcome: 'success' });`. En el catch añadir `juntasTotal.inc({ action: 'create', outcome: 'failure' });`.

En `PUT /admin/juntas/:id`, antes de `res.json(result.rows[0]);` añadir `juntasTotal.inc({ action: 'update', outcome: 'success' });`. En el `404` y el catch añadir `juntasTotal.inc({ action: 'update', outcome: 'failure' });`.

En `DELETE /admin/juntas/:id`, antes de `res.json({ message: 'Junta eliminada correctamente' });` añadir `juntasTotal.inc({ action: 'delete', outcome: 'success' });`. En el `404` y el catch añadir `juntasTotal.inc({ action: 'delete', outcome: 'failure' });`.

- [ ] **Step 5: Verificar compilación y tests**

Run: `cd api && npx tsc --noEmit && npx vitest run src/__tests__/routes.test.ts`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
cd api && git add src/routes/facturas.ts src/routes/adminAerotermia.ts src/routes/juntas.ts
git commit -m "feat(metrics): instrumentar descargas de facturas/actas y CRUD de juntas"
```

### Task 7: Tests de integración de métricas y logging

**Files:**
- Test: `api/src/__tests__/metrics.routes.test.ts`
- Modify: `api/src/__tests__/routes.test.ts` (opcional: mock logger)

- [ ] **Step 1: Escribir test de integración (login → métrica + log)**

Crear `api/src/__tests__/metrics.routes.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { register } from 'prom-client';
import authRoutes from '../routes/auth';

process.env.JWT_SECRET = 'test-secret-key';

vi.mock('../db', () => ({ query: vi.fn(), pool: {} }));
vi.mock('../lib/googleDrive', () => ({
  getPDFStream: vi.fn(), uploadPDF: vi.fn(), deleteFile: vi.fn(), renameFile: vi.fn(),
}));
vi.mock('../middleware/rateLimit', () => ({
  rateLimit: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  rateLimitOnlyOnFailure: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  rateLimitOnError: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}));
vi.mock('../lib/tokens', () => ({
  createEmailToken: vi.fn().mockResolvedValue('mock-token'),
  verifyEmailToken: vi.fn(),
  markTokenUsed: vi.fn().mockResolvedValue(undefined),
  generateToken: vi.fn().mockReturnValue('mock-token'),
  hashToken: vi.fn((t: string) => `hash-${t}`),
}));
vi.mock('../lib/email', () => ({
  sendInviteEmail: vi.fn().mockResolvedValue(undefined),
  sendResetEmail: vi.fn().mockResolvedValue(undefined),
  sentEmails: [],
}));
vi.mock('../lib/refreshTokens', () => ({
  createRefreshToken: vi.fn().mockResolvedValue('mock-refresh-token'),
  rotateRefreshToken: vi.fn(),
  revokeRefreshToken: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { query } from '../db';
import { logger } from '../lib/logger';
import { loginsTotal } from '../lib/metrics';

const mockQuery = query as ReturnType<typeof vi.fn>;
const mockLogger = logger as unknown as { info: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', authRoutes);
  return app;
}

describe('metrics + logging (auth)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    register.resetMetrics();
  });

  it('incrementa dashboard_logins_total y loguea el email en fallo de credenciales', async () => {
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('correct', 12);
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, vecino_piso: '1A', email: 'test@test.com', password_hash: hash, role: 'usuario' }],
    });

    const app = createApp();
    const res = await request(app).post('/api/auth/login').send({ email: 'test@test.com', password: 'wrong' });

    expect(res.status).toBe(401);

    const values = loginsTotal.get().values;
    expect(
      values.find((v) => v.labels.outcome === 'failure' && v.labels.reason === 'invalid_credentials')?.value
    ).toBe(1);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      { email: 'test@test.com', reason: 'invalid_credentials' },
      'Login failed'
    );
  });

  it('incrementa dashboard_password_reset_requests_total con email_found=true', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@test.com' }] });

    const app = createApp();
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'test@test.com' });

    expect(res.status).toBe(200);

    const values = register.getSingleMetric('dashboard_password_reset_requests_total')!.get().values;
    expect(values.find((v) => v.labels.email_found === 'true')?.value).toBe(1);

    expect(mockLogger.info).toHaveBeenCalledWith(
      { email: 'test@test.com', emailFound: true },
      'Forgot password requested'
    );
  });

  it('no loguea la contraseña', async () => {
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('correct', 12);
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, vecino_piso: '1A', email: 'test@test.com', password_hash: hash, role: 'usuario' }],
    });

    const app = createApp();
    await request(app).post('/api/auth/login').send({ email: 'test@test.com', password: 'secret123' });

    const calls = JSON.stringify(mockLogger.warn.mock.calls);
    expect(calls).not.toContain('secret123');
  });
});
```

- [ ] **Step 2: Ejecutar test para verificar que pasa**

Run: `cd api && npx vitest run src/__tests__/metrics.routes.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 3: Ejecutar suite completa del backend**

Run: `cd api && npm test && npx tsc --noEmit`
Expected: todos los tests pasan y compila sin errores.

- [ ] **Step 4: Commit**

```bash
cd api && git add src/__tests__/metrics.routes.test.ts
git commit -m "test(metrics): tests de integración de métricas y logging de auth"
```

### Task 8: Dashboard de Grafana + importación vía MCP

**Files:**
- Create: `grafana/observabilidad.json`

- [ ] **Step 1: Crear el JSON del dashboard**

Crear `grafana/observabilidad.json` con una variable `env` (`prod`/`dev`, default `prod`) y estos paneles (datasource Prometheus `metrics`, uid `eezd2pur0jy80e`):

1. **Logins total (stat)** — `sum(increase(dashboard_logins_total{env="$env",outcome="success"}[24h]))`
2. **Logins fallidos (stat)** — `sum(increase(dashboard_logins_total{env="$env",outcome="failure"}[24h]))`
3. **Logins por outcome (timeseries)** — `sum by (outcome) (rate(dashboard_logins_total{env="$env"}[5m]))`
4. **Resets solicitados vs completados (timeseries)** — `sum(rate(dashboard_password_reset_requests_total{env="$env"}[5m]))` y `sum by (outcome) (rate(dashboard_password_resets_total{env="$env"}[5m]))`
5. **Registros e invitaciones (timeseries)** — `sum(rate(dashboard_registrations_total{env="$env"}[5m]))` y `sum(rate(dashboard_invites_total{env="$env"}[5m]))`
6. **Descargas de facturas (timeseries)** — `sum by (scope) (rate(dashboard_facturas_descargas_total{env="$env"}[5m]))`
7. **Acciones de admin (timeseries)** — `sum by (action) (rate(dashboard_admin_users_total{env="$env"}[5m]))` y `sum by (action) (rate(dashboard_admin_vecinos_total{env="$env"}[5m]))`
8. **HTTP: errores 5xx por endpoint (timeseries)** — `sum by (path) (rate(http_requests_total{env="$env",status_code=~"5.."}[5m]))`

> El JSON completo se genera con la estructura estándar de Grafana v11/v12 (`schemaVersion`, `panels[]` con `targets[].expr` y `datasource`). Puede generarse con la herramienta `update_dashboard` del MCP pasando el objeto `dashboard` con los paneles anteriores.

- [ ] **Step 2: Importar la primera versión vía MCP**

Usar el MCP `grafana-edificio-elite` → `update_dashboard` con el `dashboard` (JSON de `grafana/observabilidad.json`) y `overwrite: true`. Anotar el UID generado.

Expected: el dashboard aparece en Grafana (folders de Edificio Elite) y el usuario puede verlo para dar feedback.

- [ ] **Step 3: Commit del JSON**

```bash
cd elite-dashboard && git add grafana/observabilidad.json
git commit -m "feat(grafana): dashboard de observabilidad"
```

---

## Notas de verificación final (ambas PRs)

- Backend: `cd api && npm test && npx tsc --noEmit` en verde.
- Frontend no cambia (no requiere `npm run build`, pero no está de más ejecutarlo si la CI lo exige).
- Infra: tras desplegar PR1, `up{job=~"dashboard_api.*"} == 1`.
- Dashboard: importado vía MCP y con datos (tras PR1 + tráfico real).
