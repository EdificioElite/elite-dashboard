# Métricas por cliente + paneles Grafana — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir un label `client` (dashboard / home-assistant) a las métricas HTTP y a los 13 contadores de negocio, y actualizar el dashboard de Grafana (variable `client`, tasa de error 4xx/5xx con colores, y rps por endpoint).

**Architecture:** El cliente se deriva del `User-Agent` (Home Assistant fuerza `HomeAssistant/<version>`). En HTTP se inyecta vía `transformLabels` de `express-prom-bundle`; en los contadores de negocio se propaga `client` en cada `.inc()`. El dashboard añade una variable `client` y paneles nuevos.

**Tech Stack:** TypeScript (strict), Express 5, `express-prom-bundle` v8, `prom-client` 15, Vitest, Grafana (JSON versionado en `grafana/observabilidad.json`).

---

## File Structure

- `api/src/lib/metrics.ts` — añade helper `clientFromRequest(req)` y label `client` a los 13 counters.
- `api/src/index.ts` — añade `transformLabels` al `promBundle`.
- `api/src/routes/auth.ts`, `admin.ts`, `juntas.ts`, `adminAerotermia.ts`, `facturas.ts` — propaga `client` en cada `.inc()`.
- `api/src/__tests__/metrics.test.ts`, `api/src/__tests__/metrics.routes.test.ts` — actualiza aserciones + nuevo test del helper.
- `grafana/observabilidad.json` — variable `client`, panel tasa de error 4xx/5xx, panel rps por endpoint, y filtro `client=~"$client"` en todos los paneles.

---

## Task 1: Helper `clientFromRequest` + label `client` en counters

**Files:**
- Modify: `api/src/lib/metrics.ts`
- Test: `api/src/__tests__/metrics.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Añadir al final de `api/src/__tests__/metrics.test.ts` (mantener los imports existentes; añadir `clientFromRequest` al import de `../lib/metrics`):

```ts
import type { Request } from 'express';

// dentro de describe('metrics', ...):
it('clientFromRequest distingue home-assistant del resto', () => {
  const ha = { headers: { 'user-agent': 'HomeAssistant/2025.1.0 aiohttp/3.9.1 Python/3.12' } } as Request;
  const web = { headers: { 'user-agent': 'Mozilla/5.0 (Macintosh) Chrome/120' } } as Request;
  const none = { headers: {} } as Request;

  expect(clientFromRequest(ha)).toBe('home-assistant');
  expect(clientFromRequest(web)).toBe('dashboard');
  expect(clientFromRequest(none)).toBe('dashboard');
});
```

- [ ] **Step 2: Ejecutar para ver que falla**

Run: `cd api && npx vitest run src/__tests__/metrics.test.ts`
Expected: FAIL con `clientFromRequest is not defined` (o error de import).

- [ ] **Step 3: Implementar helper + label `client`**

Reemplazar el contenido de `api/src/lib/metrics.ts` por:

```ts
import { Counter, register } from 'prom-client';
import type { Request } from 'express';

export function clientFromRequest(req: Request): string {
  const ua = String(req.headers['user-agent'] ?? '');
  return ua.startsWith('HomeAssistant/') ? 'home-assistant' : 'dashboard';
}

export const loginsTotal = new Counter({
  name: 'dashboard_logins_total',
  help: 'Total de intentos de login',
  labelNames: ['client', 'outcome', 'reason'],
});

export const registrationsTotal = new Counter({
  name: 'dashboard_registrations_total',
  help: 'Total de registros de usuarios',
  labelNames: ['client', 'outcome'],
});

export const passwordResetRequestsTotal = new Counter({
  name: 'dashboard_password_reset_requests_total',
  help: 'Total de solicitudes de reset de contraseña',
  labelNames: ['client', 'email_found'],
});

export const passwordResetsTotal = new Counter({
  name: 'dashboard_password_resets_total',
  help: 'Total de resets de contraseña completados',
  labelNames: ['client', 'outcome', 'reason'],
});

export const refreshTokensTotal = new Counter({
  name: 'dashboard_refresh_tokens_total',
  help: 'Total de refrescos de token',
  labelNames: ['client', 'outcome'],
});

export const logoutsTotal = new Counter({
  name: 'dashboard_logouts_total',
  help: 'Total de cierres de sesión',
  labelNames: ['client'],
});

export const verifyTokensTotal = new Counter({
  name: 'dashboard_verify_tokens_total',
  help: 'Total de verificaciones de token de email',
  labelNames: ['client', 'outcome'],
});

export const invitesTotal = new Counter({
  name: 'dashboard_invites_total',
  help: 'Total de invitaciones enviadas',
  labelNames: ['client', 'outcome'],
});

export const adminUsersTotal = new Counter({
  name: 'dashboard_admin_users_total',
  help: 'Total de acciones de admin sobre usuarios',
  labelNames: ['client', 'action', 'outcome'],
});

export const adminVecinosTotal = new Counter({
  name: 'dashboard_admin_vecinos_total',
  help: 'Total de acciones de admin sobre vecinos',
  labelNames: ['client', 'action', 'outcome'],
});

export const juntasTotal = new Counter({
  name: 'dashboard_juntas_total',
  help: 'Total de acciones sobre actas de juntas',
  labelNames: ['client', 'action', 'outcome'],
});

export const facturasDescargasTotal = new Counter({
  name: 'dashboard_facturas_descargas_total',
  help: 'Total de descargas de facturas',
  labelNames: ['client', 'scope'],
});

export const juntasDescargasTotal = new Counter({
  name: 'dashboard_juntas_descargas_total',
  help: 'Total de descargas de actas de juntas',
  labelNames: ['client'],
});

export { register };
```

- [ ] **Step 4: Actualizar los `.inc()` del test unitario**

En `api/src/__tests__/metrics.test.ts`, los tres `.inc()` existentes pasan a incluir `client: 'dashboard'`:

```ts
loginsTotal.inc({ client: 'dashboard', outcome: 'success', reason: '' });
loginsTotal.inc({ client: 'dashboard', outcome: 'failure', reason: 'invalid_credentials' });
```
```ts
passwordResetRequestsTotal.inc({ client: 'dashboard', email_found: 'true' });
```
```ts
facturasDescargasTotal.inc({ client: 'dashboard', scope: 'admin' });
```

- [ ] **Step 5: Ejecutar tests**

Run: `cd api && npx vitest run src/__tests__/metrics.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add api/src/lib/metrics.ts api/src/__tests__/metrics.test.ts
git commit -m "feat(metrics): añadir helper clientFromRequest y label client a los counters"
```

---

## Task 2: `transformLabels` en el bundle HTTP

**Files:**
- Modify: `api/src/index.ts:30-50`

- [ ] **Step 1: Importar el helper**

En `api/src/index.ts`, tras `import { config, validateConfig } from './config';` añadir:

```ts
import { clientFromRequest } from './lib/metrics';
```

- [ ] **Step 2: Añadir `transformLabels` al `promBundle`**

En el objeto de `promBundle({...})` (líneas 30-50), añadir después de `normalizePath: [...]` (antes de `autoregister: true,`):

```ts
  transformLabels: (labels, req) => {
    labels.client = clientFromRequest(req);
  },
```

- [ ] **Step 3: Verificar compilación**

Run: `cd api && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add api/src/index.ts
git commit -m "feat(metrics): añadir label client a las métricas HTTP vía transformLabels"
```

---

## Task 3: Propagar `client` en `auth.ts`

**Files:**
- Modify: `api/src/routes/auth.ts`

- [ ] **Step 1: Importar `clientFromRequest`**

Cambiar el import (líneas 11-19) para incluir `clientFromRequest`:

```ts
import {
  clientFromRequest,
  loginsTotal,
  registrationsTotal,
  passwordResetRequestsTotal,
  passwordResetsTotal,
  refreshTokensTotal,
  logoutsTotal,
  verifyTokensTotal,
} from '../lib/metrics';
```

- [ ] **Step 2: Añadir `client` a cada `.inc()`**

Aplicar las siguientes sustituciones (las marcadas `×N` son idénticas varias veces: usar replaceAll):

| Antes | Después |
|---|---|
| `loginsTotal.inc({ outcome: 'failure', reason: 'missing_credentials' });` | `loginsTotal.inc({ client: clientFromRequest(req), outcome: 'failure', reason: 'missing_credentials' });` |
| `loginsTotal.inc({ outcome: 'failure', reason: 'not_found' });` | `loginsTotal.inc({ client: clientFromRequest(req), outcome: 'failure', reason: 'not_found' });` |
| `loginsTotal.inc({ outcome: 'failure', reason: 'invalid_credentials' });` | `loginsTotal.inc({ client: clientFromRequest(req), outcome: 'failure', reason: 'invalid_credentials' });` |
| `loginsTotal.inc({ outcome: 'success', reason: '' });` | `loginsTotal.inc({ client: clientFromRequest(req), outcome: 'success', reason: '' });` |
| `loginsTotal.inc({ outcome: 'failure', reason: 'server_error' });` | `loginsTotal.inc({ client: clientFromRequest(req), outcome: 'failure', reason: 'server_error' });` |
| `refreshTokensTotal.inc({ outcome: 'failure' });` ×4 | `refreshTokensTotal.inc({ client: clientFromRequest(req), outcome: 'failure' });` |
| `refreshTokensTotal.inc({ outcome: 'success' });` | `refreshTokensTotal.inc({ client: clientFromRequest(req), outcome: 'success' });` |
| `logoutsTotal.inc();` | `logoutsTotal.inc({ client: clientFromRequest(req) });` |
| `verifyTokensTotal.inc({ outcome: 'failure' });` ×4 | `verifyTokensTotal.inc({ client: clientFromRequest(req), outcome: 'failure' });` |
| `verifyTokensTotal.inc({ outcome: 'success' });` | `verifyTokensTotal.inc({ client: clientFromRequest(req), outcome: 'success' });` |
| `registrationsTotal.inc({ outcome: 'failure' });` ×3 | `registrationsTotal.inc({ client: clientFromRequest(req), outcome: 'failure' });` |
| `registrationsTotal.inc({ outcome: 'success' });` | `registrationsTotal.inc({ client: clientFromRequest(req), outcome: 'success' });` |
| `passwordResetRequestsTotal.inc({ email_found: emailFound ? 'true' : 'false' });` | `passwordResetRequestsTotal.inc({ client: clientFromRequest(req), email_found: emailFound ? 'true' : 'false' });` |
| `passwordResetsTotal.inc({ outcome: 'failure', reason: 'invalid_token' });` ×2 | `passwordResetsTotal.inc({ client: clientFromRequest(req), outcome: 'failure', reason: 'invalid_token' });` |
| `passwordResetsTotal.inc({ outcome: 'failure', reason: 'weak_password' });` | `passwordResetsTotal.inc({ client: clientFromRequest(req), outcome: 'failure', reason: 'weak_password' });` |
| `passwordResetsTotal.inc({ outcome: 'success', reason: '' });` | `passwordResetsTotal.inc({ client: clientFromRequest(req), outcome: 'success', reason: '' });` |
| `passwordResetsTotal.inc({ outcome: 'failure', reason: 'server_error' });` | `passwordResetsTotal.inc({ client: clientFromRequest(req), outcome: 'failure', reason: 'server_error' });` |

- [ ] **Step 3: Verificar compilación**

Run: `cd api && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add api/src/routes/auth.ts
git commit -m "feat(metrics): propagar client en auth.ts"
```

---

## Task 4: Propagar `client` en `admin.ts`

**Files:**
- Modify: `api/src/routes/admin.ts`

- [ ] **Step 1: Importar `clientFromRequest`**

Cambiar la línea 11 por:

```ts
import { clientFromRequest, adminUsersTotal, adminVecinosTotal, invitesTotal } from '../lib/metrics';
```

- [ ] **Step 2: Añadir `client` a cada `.inc()`**

| Antes | Después |
|---|---|
| `adminVecinosTotal.inc({ action: 'update', outcome: 'failure' });` ×2 | `adminVecinosTotal.inc({ client: clientFromRequest(req), action: 'update', outcome: 'failure' });` |
| `adminVecinosTotal.inc({ action: 'update', outcome: 'success' });` | `adminVecinosTotal.inc({ client: clientFromRequest(req), action: 'update', outcome: 'success' });` |
| `adminVecinosTotal.inc({ action: 'create', outcome: 'failure' });` ×2 | `adminVecinosTotal.inc({ client: clientFromRequest(req), action: 'create', outcome: 'failure' });` |
| `adminVecinosTotal.inc({ action: 'create', outcome: 'success' });` | `adminVecinosTotal.inc({ client: clientFromRequest(req), action: 'create', outcome: 'success' });` |
| `adminVecinosTotal.inc({ action: 'delete', outcome: 'failure' });` ×2 | `adminVecinosTotal.inc({ client: clientFromRequest(req), action: 'delete', outcome: 'failure' });` |
| `adminVecinosTotal.inc({ action: 'delete', outcome: 'success' });` | `adminVecinosTotal.inc({ client: clientFromRequest(req), action: 'delete', outcome: 'success' });` |
| `adminUsersTotal.inc({ action: 'update', outcome: 'success' });` | `adminUsersTotal.inc({ client: clientFromRequest(req), action: 'update', outcome: 'success' });` |
| `adminUsersTotal.inc({ action: 'update', outcome: 'failure' });` ×2 | `adminUsersTotal.inc({ client: clientFromRequest(req), action: 'update', outcome: 'failure' });` |
| `adminUsersTotal.inc({ action: 'change_password', outcome: 'failure' });` ×2 | `adminUsersTotal.inc({ client: clientFromRequest(req), action: 'change_password', outcome: 'failure' });` |
| `adminUsersTotal.inc({ action: 'change_password', outcome: 'success' });` | `adminUsersTotal.inc({ client: clientFromRequest(req), action: 'change_password', outcome: 'success' });` |
| `adminUsersTotal.inc({ action: 'delete', outcome: 'failure' });` ×2 | `adminUsersTotal.inc({ client: clientFromRequest(req), action: 'delete', outcome: 'failure' });` |
| `adminUsersTotal.inc({ action: 'delete', outcome: 'success' });` | `adminUsersTotal.inc({ client: clientFromRequest(req), action: 'delete', outcome: 'success' });` |
| `invitesTotal.inc({ outcome: 'success' });` ×2 | `invitesTotal.inc({ client: clientFromRequest(req), outcome: 'success' });` |
| `invitesTotal.inc({ outcome: 'failure' });` ×2 | `invitesTotal.inc({ client: clientFromRequest(req), outcome: 'failure' });` |

- [ ] **Step 3: Verificar compilación**

Run: `cd api && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add api/src/routes/admin.ts
git commit -m "feat(metrics): propagar client en admin.ts"
```

---

## Task 5: Propagar `client` en `juntas.ts`

**Files:**
- Modify: `api/src/routes/juntas.ts`

- [ ] **Step 1: Importar `clientFromRequest`**

Cambiar la línea 8 por:

```ts
import { clientFromRequest, juntasDescargasTotal, juntasTotal } from '../lib/metrics';
```

- [ ] **Step 2: Añadir `client` a cada `.inc()`**

| Antes | Después |
|---|---|
| `juntasDescargasTotal.inc();` | `juntasDescargasTotal.inc({ client: clientFromRequest(req) });` |
| `juntasTotal.inc({ action: 'create', outcome: 'success' });` | `juntasTotal.inc({ client: clientFromRequest(req), action: 'create', outcome: 'success' });` |
| `juntasTotal.inc({ action: 'create', outcome: 'failure' });` | `juntasTotal.inc({ client: clientFromRequest(req), action: 'create', outcome: 'failure' });` |
| `juntasTotal.inc({ action: 'update', outcome: 'failure' });` ×2 | `juntasTotal.inc({ client: clientFromRequest(req), action: 'update', outcome: 'failure' });` |
| `juntasTotal.inc({ action: 'update', outcome: 'success' });` | `juntasTotal.inc({ client: clientFromRequest(req), action: 'update', outcome: 'success' });` |
| `juntasTotal.inc({ action: 'delete', outcome: 'failure' });` ×2 | `juntasTotal.inc({ client: clientFromRequest(req), action: 'delete', outcome: 'failure' });` |
| `juntasTotal.inc({ action: 'delete', outcome: 'success' });` | `juntasTotal.inc({ client: clientFromRequest(req), action: 'delete', outcome: 'success' });` |

Nota: en `POST /admin/juntas` y `PUT /admin/juntas/:id` el handler es `(req, res)` (sin tipos explícitos), por lo que `req` es `Request` implícitamente y `clientFromRequest(req)` tipa bien.

- [ ] **Step 3: Verificar compilación**

Run: `cd api && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add api/src/routes/juntas.ts
git commit -m "feat(metrics): propagar client en juntas.ts"
```

---

## Task 6: Propagar `client` en `adminAerotermia.ts` y `facturas.ts`

**Files:**
- Modify: `api/src/routes/adminAerotermia.ts`
- Modify: `api/src/routes/facturas.ts`

- [ ] **Step 1: Importar `clientFromRequest`**

En `adminAerotermia.ts`, cambiar la línea 7 por:
```ts
import { clientFromRequest, facturasDescargasTotal } from '../lib/metrics';
```

En `facturas.ts`, cambiar la línea 6 por:
```ts
import { clientFromRequest, facturasDescargasTotal } from '../lib/metrics';
```

- [ ] **Step 2: Añadir `client` a cada `.inc()`**

`adminAerotermia.ts`:
| Antes | Después |
|---|---|
| `facturasDescargasTotal.inc({ scope: 'admin' });` | `facturasDescargasTotal.inc({ client: clientFromRequest(req), scope: 'admin' });` |

`facturas.ts`:
| Antes | Después |
|---|---|
| `facturasDescargasTotal.inc({ scope: 'user' });` | `facturasDescargasTotal.inc({ client: clientFromRequest(req), scope: 'user' });` |

- [ ] **Step 3: Verificar compilación**

Run: `cd api && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add api/src/routes/adminAerotermia.ts api/src/routes/facturas.ts
git commit -m "feat(metrics): propagar client en adminAerotermia y facturas"
```

---

## Task 7: Actualizar tests de rutas + verificar backend completo

**Files:**
- Modify: `api/src/__tests__/metrics.routes.test.ts`

- [ ] **Step 1: Añadir aserción de `client` en el test de login**

En el test `incrementa dashboard_logins_total y loguea el email en fallo de credenciales` (líneas 74-77), sustituir el bloque `expect(values.find(...)...)` por:

```ts
    const values = (await loginsTotal.get()).values;
    expect(
      values.find(
        (v) =>
          v.labels.client === 'dashboard' &&
          v.labels.outcome === 'failure' &&
          v.labels.reason === 'invalid_credentials'
      )?.value
    ).toBe(1);
```

- [ ] **Step 2: Ejecutar tests y typecheck del backend**

Run: `cd api && npm test && npx tsc --noEmit`
Expected: todos los tests PASS y typecheck sin errores.

- [ ] **Step 3: Commit**

```bash
git add api/src/__tests__/metrics.routes.test.ts
git commit -m "test(metrics): assert client label en login"
```

---

## Task 8: Dashboard — variable `client` + paneles + filtro global

**Files:**
- Modify: `grafana/observabilidad.json` (reescribir el archivo completo)

- [ ] **Step 1: Reescribir `grafana/observabilidad.json` con el contenido final**

Reemplazar el archivo completo por el siguiente JSON (añade la variable `client`, reescribe el panel de tasa de error, añade el panel de rps por endpoint, y propaga `client=~"$client"` a todos los paneles):

```json
{
  "uid": "dashboard-api-observabilidad",
  "title": "Dashboard API - Observabilidad",
  "tags": ["dashboard-api", "observabilidad", "elite"],
  "timezone": "browser",
  "schemaVersion": 39,
  "version": 1,
  "refresh": "30s",
  "time": { "from": "now-24h", "to": "now" },
  "templating": {
    "list": [
      {
        "name": "env",
        "type": "custom",
        "label": "Entorno",
        "current": { "text": "prod", "value": "prod" },
        "options": [
          { "text": "prod", "value": "prod", "selected": true },
          { "text": "dev", "value": "dev", "selected": false }
        ],
        "query": "prod,dev",
        "multi": false,
        "includeAll": false
      },
      {
        "name": "client",
        "type": "custom",
        "label": "Cliente",
        "current": { "text": "All", "value": ".*" },
        "options": [
          { "text": "All", "value": ".*", "selected": true },
          { "text": "dashboard", "value": "dashboard", "selected": false },
          { "text": "home-assistant", "value": "home-assistant", "selected": false }
        ],
        "query": ".*,dashboard,home-assistant",
        "multi": false,
        "includeAll": false
      }
    ]
  },
  "panels": [
    {
      "id": 1,
      "type": "stat",
      "title": "Logins (24h, éxito)",
      "gridPos": { "h": 4, "w": 6, "x": 0, "y": 0 },
      "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" },
      "fieldConfig": { "defaults": { "color": { "mode": "thresholds" }, "thresholds": { "steps": [{ "color": "green", "value": null }] } }, "overrides": [] },
      "options": { "reduceOptions": { "values": false, "calcs": ["lastNotNull"] }, "colorMode": "value", "graphMode": "none", "justifyMode": "auto" },
      "targets": [
        { "refId": "A", "expr": "sum(increase(dashboard_logins_total{env=\"$env\",client=~\"$client\",outcome=\"success\"}[24h]))", "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" }, "instant": true }
      ]
    },
    {
      "id": 2,
      "type": "stat",
      "title": "Logins fallidos (24h)",
      "gridPos": { "h": 4, "w": 6, "x": 6, "y": 0 },
      "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" },
      "fieldConfig": { "defaults": { "color": { "mode": "thresholds" }, "thresholds": { "steps": [{ "color": "red", "value": null }] } }, "overrides": [] },
      "options": { "reduceOptions": { "values": false, "calcs": ["lastNotNull"] }, "colorMode": "value", "graphMode": "none", "justifyMode": "auto" },
      "targets": [
        { "refId": "A", "expr": "sum(increase(dashboard_logins_total{env=\"$env\",client=~\"$client\",outcome=\"failure\"}[24h]))", "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" }, "instant": true }
      ]
    },
    {
      "id": 3,
      "type": "stat",
      "title": "Resets solicitados (24h)",
      "gridPos": { "h": 4, "w": 6, "x": 12, "y": 0 },
      "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" },
      "fieldConfig": { "defaults": { "color": { "mode": "thresholds" }, "thresholds": { "steps": [{ "color": "blue", "value": null }] } }, "overrides": [] },
      "options": { "reduceOptions": { "values": false, "calcs": ["lastNotNull"] }, "colorMode": "value", "graphMode": "none", "justifyMode": "auto" },
      "targets": [
        { "refId": "A", "expr": "sum(increase(dashboard_password_reset_requests_total{env=\"$env\",client=~\"$client\"}[24h]))", "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" }, "instant": true }
      ]
    },
    {
      "id": 4,
      "type": "stat",
      "title": "Resets completados (24h)",
      "gridPos": { "h": 4, "w": 6, "x": 18, "y": 0 },
      "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" },
      "fieldConfig": { "defaults": { "color": { "mode": "thresholds" }, "thresholds": { "steps": [{ "color": "green", "value": null }] } }, "overrides": [] },
      "options": { "reduceOptions": { "values": false, "calcs": ["lastNotNull"] }, "colorMode": "value", "graphMode": "none", "justifyMode": "auto" },
      "targets": [
        { "refId": "A", "expr": "sum(increase(dashboard_password_resets_total{env=\"$env\",client=~\"$client\",outcome=\"success\"}[24h]))", "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" }, "instant": true }
      ]
    },
    {
      "id": 11,
      "type": "stat",
      "title": "Requests por segundo",
      "gridPos": { "h": 4, "w": 6, "x": 0, "y": 4 },
      "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" },
      "fieldConfig": { "defaults": { "unit": "reqps", "color": { "mode": "thresholds" }, "thresholds": { "steps": [{ "color": "green", "value": null }] } }, "overrides": [] },
      "options": { "reduceOptions": { "values": false, "calcs": ["lastNotNull"] }, "colorMode": "value", "graphMode": "area", "justifyMode": "auto" },
      "targets": [
        { "refId": "A", "expr": "sum(rate(http_request_duration_seconds_count{env=\"$env\",client=~\"$client\"}[5m]))", "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" }, "instant": true }
      ]
    },
    {
      "id": 12,
      "type": "stat",
      "title": "Errores 5xx (24h)",
      "gridPos": { "h": 4, "w": 6, "x": 6, "y": 4 },
      "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" },
      "fieldConfig": { "defaults": { "color": { "mode": "thresholds" }, "thresholds": { "steps": [{ "color": "red", "value": null }] } }, "overrides": [] },
      "options": { "reduceOptions": { "values": false, "calcs": ["lastNotNull"] }, "colorMode": "value", "graphMode": "none", "justifyMode": "auto" },
      "targets": [
        { "refId": "A", "expr": "sum(increase(http_request_duration_seconds_count{env=\"$env\",client=~\"$client\",status_code=~\"5..\"}[24h]))", "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" }, "instant": true }
      ]
    },
    {
      "id": 13,
      "type": "stat",
      "title": "Latencia p95",
      "gridPos": { "h": 4, "w": 12, "x": 12, "y": 4 },
      "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" },
      "fieldConfig": { "defaults": { "unit": "s", "color": { "mode": "thresholds" }, "thresholds": { "steps": [{ "color": "green", "value": null }, { "color": "orange", "value": 0.5 }, { "color": "red", "value": 1 }] } }, "overrides": [] },
      "options": { "reduceOptions": { "values": false, "calcs": ["lastNotNull"] }, "colorMode": "value", "graphMode": "area", "justifyMode": "auto" },
      "targets": [
        { "refId": "A", "expr": "histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{env=\"$env\",client=~\"$client\"}[5m])))", "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" }, "instant": true }
      ]
    },
    {
      "id": 5,
      "type": "timeseries",
      "title": "Logins por outcome",
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 8 },
      "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" },
      "fieldConfig": { "defaults": { "unit": "reqps" }, "overrides": [] },
      "targets": [
        { "refId": "A", "expr": "sum by (outcome) (rate(dashboard_logins_total{env=\"$env\",client=~\"$client\"}[5m]))", "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" }, "legendFormat": "{{outcome}}" }
      ]
    },
    {
      "id": 6,
      "type": "timeseries",
      "title": "Resets solicitados vs completados",
      "gridPos": { "h": 8, "w": 12, "x": 12, "y": 8 },
      "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" },
      "fieldConfig": { "defaults": { "unit": "reqps" }, "overrides": [] },
      "targets": [
        { "refId": "A", "expr": "sum(rate(dashboard_password_reset_requests_total{env=\"$env\",client=~\"$client\"}[5m]))", "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" }, "legendFormat": "solicitados" },
        { "refId": "B", "expr": "sum by (outcome) (rate(dashboard_password_resets_total{env=\"$env\",client=~\"$client\"}[5m]))", "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" }, "legendFormat": "reset {{outcome}}" }
      ]
    },
    {
      "id": 7,
      "type": "timeseries",
      "title": "Registros e invitaciones",
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 16 },
      "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" },
      "fieldConfig": { "defaults": { "unit": "reqps" }, "overrides": [] },
      "targets": [
        { "refId": "A", "expr": "sum(rate(dashboard_registrations_total{env=\"$env\",client=~\"$client\"}[5m]))", "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" }, "legendFormat": "registros" },
        { "refId": "B", "expr": "sum(rate(dashboard_invites_total{env=\"$env\",client=~\"$client\"}[5m]))", "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" }, "legendFormat": "invitaciones" }
      ]
    },
    {
      "id": 8,
      "type": "timeseries",
      "title": "Descargas de facturas",
      "gridPos": { "h": 8, "w": 12, "x": 12, "y": 16 },
      "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" },
      "fieldConfig": { "defaults": { "unit": "reqps" }, "overrides": [] },
      "targets": [
        { "refId": "A", "expr": "sum by (scope) (rate(dashboard_facturas_descargas_total{env=\"$env\",client=~\"$client\"}[5m]))", "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" }, "legendFormat": "{{scope}}" }
      ]
    },
    {
      "id": 9,
      "type": "timeseries",
      "title": "Acciones de admin",
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 24 },
      "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" },
      "fieldConfig": { "defaults": { "unit": "reqps" }, "overrides": [] },
      "targets": [
        { "refId": "A", "expr": "sum by (action) (rate(dashboard_admin_users_total{env=\"$env\",client=~\"$client\"}[5m]))", "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" }, "legendFormat": "usuarios {{action}}" },
        { "refId": "B", "expr": "sum by (action) (rate(dashboard_admin_vecinos_total{env=\"$env\",client=~\"$client\"}[5m]))", "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" }, "legendFormat": "vecinos {{action}}" }
      ]
    },
    {
      "id": 10,
      "type": "timeseries",
      "title": "HTTP: requests por segundo (status)",
      "gridPos": { "h": 8, "w": 12, "x": 12, "y": 24 },
      "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" },
      "fieldConfig": { "defaults": { "unit": "reqps" }, "overrides": [] },
      "targets": [
        { "refId": "A", "expr": "sum by (status_code) (rate(http_request_duration_seconds_count{env=\"$env\",client=~\"$client\"}[5m]))", "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" }, "legendFormat": "{{status_code}}" }
      ]
    },
    {
      "id": 14,
      "type": "timeseries",
      "title": "HTTP: latencia p50 / p95 / p99",
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 32 },
      "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" },
      "fieldConfig": { "defaults": { "unit": "s" }, "overrides": [] },
      "targets": [
        { "refId": "A", "expr": "histogram_quantile(0.50, sum by (le) (rate(http_request_duration_seconds_bucket{env=\"$env\",client=~\"$client\"}[5m])))", "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" }, "legendFormat": "p50" },
        { "refId": "B", "expr": "histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{env=\"$env\",client=~\"$client\"}[5m])))", "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" }, "legendFormat": "p95" },
        { "refId": "C", "expr": "histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket{env=\"$env\",client=~\"$client\"}[5m])))", "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" }, "legendFormat": "p99" }
      ]
    },
    {
      "id": 15,
      "type": "timeseries",
      "title": "HTTP: errores 4xx/5xx",
      "gridPos": { "h": 8, "w": 12, "x": 12, "y": 32 },
      "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" },
      "fieldConfig": { "defaults": { "unit": "reqps" }, "overrides": [] },
      "targets": [
        { "refId": "A", "expr": "sum by (status_code) (rate(http_request_duration_seconds_count{env=\"$env\",client=~\"$client\",status_code=~\"4..|5..\"}[5m]))", "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" }, "legendFormat": "{{status_code}}" }
      ]
    },
    {
      "id": 16,
      "type": "timeseries",
      "title": "HTTP: errores 5xx por endpoint",
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 40 },
      "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" },
      "fieldConfig": { "defaults": { "unit": "reqps" }, "overrides": [] },
      "targets": [
        { "refId": "A", "expr": "sum by (path) (rate(http_request_duration_seconds_count{env=\"$env\",client=~\"$client\",status_code=~\"5..\"}[5m]))", "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" }, "legendFormat": "{{path}}" }
      ]
    },
    {
      "id": 17,
      "type": "timeseries",
      "title": "HTTP: latencia p95 por endpoint",
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 48 },
      "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" },
      "fieldConfig": { "defaults": { "unit": "s" }, "overrides": [] },
      "targets": [
        { "refId": "A", "expr": "histogram_quantile(0.95, sum by (le, path) (rate(http_request_duration_seconds_bucket{env=\"$env\",client=~\"$client\"}[5m])))", "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" }, "legendFormat": "{{path}}" }
      ]
    },
    {
      "id": 21,
      "type": "timeseries",
      "title": "Requests por método",
      "gridPos": { "h": 8, "w": 12, "x": 12, "y": 48 },
      "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" },
      "fieldConfig": { "defaults": { "unit": "reqps" }, "overrides": [] },
      "targets": [
        { "refId": "A", "expr": "sum by (method) (rate(http_request_duration_seconds_count{env=\"$env\",client=~\"$client\"}[5m]))", "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" }, "legendFormat": "{{method}}" }
      ]
    },
    {
      "id": 18,
      "type": "table",
      "title": "Top 10 endpoints más lentos (p95)",
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 56 },
      "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" },
      "fieldConfig": { "defaults": { "unit": "s" }, "overrides": [] },
      "targets": [
        { "refId": "A", "expr": "topk(10, histogram_quantile(0.95, sum by (le, path) (rate(http_request_duration_seconds_bucket{env=\"$env\",client=~\"$client\"}[5m]))))", "instant": true, "format": "table", "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" } }
      ]
    },
    {
      "id": 19,
      "type": "table",
      "title": "Top 10 endpoints por requests",
      "gridPos": { "h": 8, "w": 12, "x": 12, "y": 56 },
      "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" },
      "fieldConfig": { "defaults": { "unit": "reqps" }, "overrides": [] },
      "targets": [
        { "refId": "A", "expr": "topk(10, sum by (path) (rate(http_request_duration_seconds_count{env=\"$env\",client=~\"$client\"}[5m])))", "instant": true, "format": "table", "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" } }
      ]
    },
    {
      "id": 22,
      "type": "timeseries",
      "title": "HTTP: latencia media",
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 64 },
      "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" },
      "fieldConfig": { "defaults": { "unit": "s" }, "overrides": [] },
      "targets": [
        { "refId": "A", "expr": "sum(rate(http_request_duration_seconds_sum{env=\"$env\",client=~\"$client\"}[5m])) / sum(rate(http_request_duration_seconds_count{env=\"$env\",client=~\"$client\"}[5m]))", "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" }, "legendFormat": "media" }
      ]
    },
    {
      "id": 20,
      "type": "timeseries",
      "title": "HTTP: tasa de error por tipo",
      "gridPos": { "h": 8, "w": 12, "x": 12, "y": 64 },
      "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" },
      "fieldConfig": {
        "defaults": { "unit": "percent" },
        "overrides": [
          { "matcher": { "id": "byName", "options": "4xx" }, "properties": [ { "id": "color", "value": { "fixedColor": "blue", "mode": "fixed" } } ] },
          { "matcher": { "id": "byName", "options": "5xx" }, "properties": [ { "id": "color", "value": { "fixedColor": "red", "mode": "fixed" } } ] }
        ]
      },
      "targets": [
        { "refId": "A", "expr": "sum(rate(http_request_duration_seconds_count{env=\"$env\",client=~\"$client\",status_code=~\"4..\"}[5m])) / clamp_min(sum(rate(http_request_duration_seconds_count{env=\"$env\",client=~\"$client\"}[5m])), 1) * 100", "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" }, "legendFormat": "4xx" },
        { "refId": "B", "expr": "sum(rate(http_request_duration_seconds_count{env=\"$env\",client=~\"$client\",status_code=~\"5..\"}[5m])) / clamp_min(sum(rate(http_request_duration_seconds_count{env=\"$env\",client=~\"$client\"}[5m])), 1) * 100", "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" }, "legendFormat": "5xx" }
      ]
    },
    {
      "id": 23,
      "type": "timeseries",
      "title": "HTTP: requests por segundo por endpoint",
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 72 },
      "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" },
      "fieldConfig": { "defaults": { "unit": "reqps" }, "overrides": [] },
      "targets": [
        { "refId": "A", "expr": "sum by (path) (rate(http_request_duration_seconds_count{env=\"$env\",client=~\"$client\"}[5m]))", "datasource": { "type": "prometheus", "uid": "eezd2pur0jy80e" }, "legendFormat": "{{path}}" }
      ]
    }
  ]
}
```

- [ ] **Step 2: Validar que el JSON es válido**

Run: `cd /Users/gorkarevilla/workspace/elite-dashboard && node -e "JSON.parse(require('fs').readFileSync('grafana/observabilidad.json','utf8')); console.log('JSON OK')"`
Expected: `JSON OK`

- [ ] **Step 3: Commit**

```bash
git add grafana/observabilidad.json
git commit -m "feat(grafana): variable client, tasa de error 4xx/5xx y rps por endpoint"
```

---

## Task 9: Verificación final

- [ ] **Step 1: Backend completo**

Run: `cd api && npm test && npx tsc --noEmit`
Expected: PASS + typecheck limpio.

- [ ] **Step 2: Frontend build (por si algo del repo raíz se ve afectado)**

Run: `cd /Users/gorkarevilla/workspace/elite-dashboard && npm run build`
Expected: build OK.

- [ ] **Step 3: Revisar documentación**

Comprobar `AGENTS.md` (sección Observabilidad) y el JSON del dashboard ya versionado. La convención de "actualizar JSON al añadir métrica" queda cubierta por esta PR (no requiere cambios adicionales).

---

## Self-Review (completado al redactar)

- **Spec coverage:** helper (Task 1), HTTP transformLabels (Task 2), counters de negocio (Tasks 3-6), tests (Tasks 1, 7), variable `client` + panel tasa error 4xx/5xx + panel rps por endpoint + filtro global (Task 8), verificación (Task 9). Cubierto.
- **Placeholder scan:** sin TBD/TODO; todos los pasos tienen código y comandos concretos.
- **Type consistency:** `clientFromRequest(req: Request): string` usado consistentemente; label `client` con valores `dashboard`/`home-assistant` en todas las tareas.
