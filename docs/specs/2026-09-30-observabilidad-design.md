# Observabilidad: métricas, logging y scraping del dashboard

## Objetivo

Tres mejoras de observabilidad para poder responder preguntas operativas (cuántos
logins/resets ha habido, a qué usuario le ocurre un error, si un endpoint falla):

1. Hacer que Alloy scrapee las métricas del backend (`dashboard-api` y
   `dashboard-api-dev`) hacia Prometheus.
2. Añadir métricas custom de negocio (logins, resets, altas, descargas, etc.).
3. Mejorar el logging para ver emails/usuarios, redactando passwords y otros
   datos sensibles.

Además, un dashboard de Grafana que consume esas métricas.

## Contexto

- El backend (`api/`) usa `express-prom-bundle` para métricas HTTP (expuestas en
  `/metrics`), y `pino` + `pino-http` para logs. `prom-client` **no** es
  dependencia directa (lo trae `express-prom-bundle` de forma transitiva).
- `pino-http` loguea método, url, headers (redactando `authorization` y
  `cookie`), status y `responseTime`, pero **no** el body. Por eso hoy no se ve
  qué email pide un reset.
- **Hallazgo**: Alloy ya tiene la sección de scrape del dashboard-api en
  `elite-portainer-compose/monitoring/config/config.alloy` (líneas 123-143), pero
  está **rota por un error de sintaxis** (`missing ',' in field list`) que tira
  abajo todo Alloy (system metrics, docker logs, etc.). Alloy v1.18.0.
- Red: Alloy está en la red externa `elite_shared`; `dashboard-api` también.
  `dashboard-api:3001` es alcanzable. Solo falta arreglar la sintaxis.
- En producción el `DATABASE_URL` apunta a la BD `aerotermia` (`elite` es solo
  el valor del `.env.example` local).

## Alcance y repos

Un spec, dos PRs:

| PR | Repo | Contenido |
|---|---|---|
| PR1 | `elite-portainer-compose` | Fix sintaxis de `config.alloy` |
| PR2 | `elite-dashboard` | Métricas custom + logging + dashboard de Grafana (JSON en `grafana/`) |

PR1 es independiente y pequeño. PR2 no depende de PR1 (la API expone `/metrics`
igual; solo "no llegan" a Prometheus hasta que PR1 esté desplegado).

## Métricas

Nuevo módulo `api/src/lib/metrics.ts` usando `prom-client` (nueva dependencia
directa). `express-prom-bundle` se configura para compartir el mismo registry →
un único `/metrics` con métricas HTTP + custom.

Convención: prefijo `dashboard_`, counters con sufijo `_total`, labels en
minúsculas y de baja cardinalidad. **Nunca** se usan `email`, `piso` ni `ip`
como labels (eso va en logs); solo valores acotados.

### Auth

| Métrica | Labels | Valores de `reason` |
|---|---|---|
| `dashboard_logins_total` | `outcome`, `reason` | `missing_credentials`, `not_found`, `invalid_credentials`, `server_error` |
| `dashboard_registrations_total` | `outcome` | — |
| `dashboard_password_reset_requests_total` | `email_found` | `true`/`false` |
| `dashboard_password_resets_total` | `outcome`, `reason` | `invalid_token`, `weak_password`, `server_error` |
| `dashboard_refresh_tokens_total` | `outcome` | — |
| `dashboard_logouts_total` | — | — |
| `dashboard_verify_tokens_total` | `outcome` | — |
| `dashboard_invites_total` | `outcome` | — |

> `dashboard_invites_total` se incrementa en los dos endpoints de invitación:
> `POST /admin/usuarios` (invitar por email) y `POST /admin/invitar` (invitar por piso).

### Admin

| Métrica | Labels |
|---|---|
| `dashboard_admin_users_total` | `action` (`update`/`delete`/`change_password`), `outcome` |
| `dashboard_admin_vecinos_total` | `action` (`create`/`update`/`delete`), `outcome` |
| `dashboard_juntas_total` | `action` (`create`/`update`/`delete`), `outcome` |

### Negocio

| Métrica | Labels |
|---|---|
| `dashboard_facturas_descargas_total` | `scope` (`user`/`admin`) |
| `dashboard_juntas_descargas_total` | — |

### Qué NO se instrumenta

Lecturas puras (`GET /consumos`, `GET /facturas`, `GET /juntas`, `GET /vecinos`,
etc.) ya quedan cubiertas por `http_requests_total{path=...}` del bundle (contador
+ latencia + status). No se duplican contadores.

## Logging

Logs explícitos con contexto de usuario en los handlers clave, más redacción de
datos sensibles como red de seguridad.

### Logs a añadir

| Evento | Log |
|---|---|
| login | `logger.info({ email }, 'Login successful')` / `logger.warn({ email, reason }, 'Login failed')` |
| register | `logger.info({ email, piso }, 'User registered')` |
| forgot-password | `logger.info({ email, emailFound }, 'Forgot password requested')` |
| reset-password | `logger.info({ email }, 'Password reset successful')` / warn con `reason` |
| invite | `logger.info({ email, piso }, 'Invite sent')` |
| admin usuarios/vecinos/juntas (create/update/delete/change-password) | `logger.info({ email, piso, action }, ...)` |

### Logs de error con contexto

Los `logger.error(err, 'X error')` actuales pasan a
`logger.error({ err, email }, 'X error')` para atar el error al usuario.

### Redacción

En `api/src/lib/logger.ts`, añadir `redact` de pino (`censor: '[REDACTED]'`) para:
`password`, `password_hash`, `token`, `refresh_token`, `authorization`, `cookie`.

Se mantiene el `redact` de `pino-http` (`authorization`/`cookie` en headers).

### Qué no se loguea nunca

Passwords (ni para validación), `token`/`token_hash`, `password_hash`,
`JWT_SECRET`.

### Nota PII

El email se loguea en claro por decisión consciente del propietario (para
identificar a qué usuario le ocurre un error). Documentado como decisión tomada.

## Fix de Alloy (`elite-portainer-compose`)

Corregir la sintaxis de los objetos literales de `targets` (falta la coma final):

```alloy
prometheus.scrape "dashboard_api" {
  scrape_interval = "30s"
  targets = [{
    __address__ = "dashboard-api:3001",
    env         = "prod",
  }]
  metrics_path = "/metrics"
  forward_to = [prometheus.remote_write.default.receiver]
}
```

Ídem para `dashboard_api_dev` con `env = "dev"`.

- El `job` por defecto es el nombre del componente (`dashboard_api` /
  `dashboard_api_dev`), suficiente para distinguir prod/dev.
- El label `env` explícito permite filtrar por `$env` en Grafana sin tocar el job.

### Verificación

- `alloy fmt` / arrancar Alloy y revisar logs (que ya no falle la carga).
- En Prometheus: `up{job=~"dashboard_api.*"} == 1` para ambos y
  `http_requests_total{job="dashboard_api"}` con datos.

## Dashboard de Grafana

El JSON del dashboard se versiona en el repo `elite-dashboard` en la carpeta
`grafana/` (fichero `grafana/observabilidad.json`). Se importa a Grafana usando
el MCP `grafana-edificio-elite` (`update_dashboard`).

Flujo: se importa una primera versión del dashboard vía MCP tan pronto como esté
lista, para que el propietario pueda verlo y dar feedback temprano mientras se
trabaja en la PR. El JSON en `grafana/` es la fuente de verdad; cada iteración
del dashboard se refleja en el repo.

Paneles previstos (variable `$env` = `prod`/`dev`):

- Logins totales y por outcome (`rate(dashboard_logins_total[5m])`).
- Resets solicitados / completados (`dashboard_password_reset_requests_total`,
  `dashboard_password_resets_total`).
- Registros e invitaciones.
- Descargas de facturas/actas.
- HTTP: tasa de error por endpoint (`http_requests_total` + status).

## Testing

Backend (`elite-dashboard`):

- Métricas: tras llamar a los handlers (supertest), leer el registry y verificar
  que el counter correcto se incrementa con el label correcto (p.ej.
  `dashboard_logins_total{outcome="failure",reason="invalid_credentials"}`).
- Logging: mockear `logger` y verificar que se llama con `email` y que **no** se
  loguea `password`.
- `cd api && npm test && npx tsc --noEmit`.

Infra (`elite-portainer-compose`):

- Validar sintaxis Alloy antes de mergear y revisar logs post-deploy.

## Fuera de alcance

- Alertas de Grafana (solo dashboard).
- Cambios en la retención de Prometheus/Loki (ya configurada en infra).
- Instrumentar lecturas puras (ya cubiertas por métricas HTTP).
- Provisioning automático de dashboards de Grafana (el dashboard se importa vía
  MCP; el JSON vive en el repo como fuente de verdad).
