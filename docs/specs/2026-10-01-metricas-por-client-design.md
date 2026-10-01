# Métricas por cliente + paneles Grafana (rps por endpoint y tasa de error por tipo)

## Objetivo

1. Distinguir en las métricas los dos frontends que consumen la API:
   - el dashboard web (página React), y
   - el plugin de Home Assistant.
2. Añadir dos paneles al dashboard de Grafana:
   - tasa de error HTTP desglosada por tipo (4xx azul, 5xx rojo),
   - requests por segundo por endpoint.

## Contexto

- Las métricas HTTP las genera `express-prom-bundle` v8 en `api/src/index.ts`,
  con `includeMethod/includePath/includeStatusCode` y `normalizePath`. El histograma
  resultante es `http_request_duration_seconds` (labels `method`, `path`,
  `status_code`, `up`).
- Los contadores de negocio viven en `api/src/lib/metrics.ts` (13 counters, todos
  con prefijo `dashboard_` y sufijo `_total`).
- Home Assistant, vía `async_get_clientsession(hass)`, **fuerza** la cabecera
  `User-Agent: HomeAssistant/<version>` (lo hace HA a propósito para identificarse;
  verificado en su fuente). El dashboard web envía `Mozilla/5.0 ...`.
- El plugin HA ya manda `"source": "home-assistant"` en el body del login, pero
  eso solo cubre el endpoint de login. El `User-Agent` cubre **todas** las
  peticiones sin tocar ninguno de los dos frontends.

## Decisión de diseño

- **Label `client`** con valores `dashboard` (por defecto, cualquier cliente que
  no sea HA) y `home-assistant`. Es de baja cardinalidad (2 valores), cumple la
  convención de labels en minúsculas.
- Derivación del cliente desde `User-Agent`, sin cambios en frontends.
- El label `client` se añade **tanto** a las métricas HTTP (vía `transformLabels`)
  como a los **13 contadores de negocio** (decisión del propietario: uniformidad
  por encima de evitar un label redundante en contadores de solo-admin).

## Backend (`elite-dashboard/api`)

### Helper

En `api/src/lib/metrics.ts`:

```ts
export function clientFromRequest(req: Request): string {
  const ua = String(req.headers['user-agent'] ?? '');
  return ua.startsWith('HomeAssistant/') ? 'home-assistant' : 'dashboard';
}
```

### Métricas HTTP

En `api/src/index.ts`, añadir al `promBundle`:

```ts
transformLabels: (labels, req) => {
  labels.client = clientFromRequest(req);
},
```

Cubre automáticamente rps, errores y latencia por endpoint y por cliente.

### Contadores de negocio

Añadir `client` a `labelNames` de los 13 counters de `api/src/lib/metrics.ts` y
propagar `client: clientFromRequest(req)` en todas las llamadas `.inc()` de:

- `api/src/routes/auth.ts` (~28 llamadas)
- `api/src/routes/admin.ts` (~24)
- `api/src/routes/adminAerotermia.ts` (~1)
- `api/src/routes/facturas.ts` (~1)
- `api/src/routes/juntas.ts` (~9)

El cambio es mecánico y explícito: cada `.inc({ ...labels, client })`.

## Dashboard (`grafana/observabilidad.json`)

### Variable `client`

Nueva variable de plantilla `client`, tipo custom, opciones:

- `All` (valor `.*`, por defecto)
- `dashboard`
- `home-assistant`

Los queries HTTP usan `client=~"$client"` para que la variable filtre todo el
dashboard.

### Panel "HTTP: tasa de error" (reemplaza el combinado actual)

Un solo panel timeseries con dos series y overrides de color:

- `4xx` (azul):
  `sum(rate(http_request_duration_seconds_count{env="$env",client=~"$client",status_code=~"4.."}[5m])) / clamp_min(sum(rate(http_request_duration_seconds_count{env="$env",client=~"$client"}[5m])), 1) * 100`
- `5xx` (rojo): análogo con `status_code=~"5.."`.

### Panel "HTTP: requests por segundo por endpoint"

Timeseries con una serie por endpoint:

- `sum by (path) (rate(http_request_duration_seconds_count{env="$env",client=~"$client"}[5m]))`
- `legendFormat: {{path}}`

### Propagar `client=~"$client"`

Añadir el filtro `client=~"$client"` a los paneles HTTP existentes (errores
4xx/5xx, 5xx por endpoint, latencia p95 por endpoint, requests por método, tasa
de error, latencia media, top-N) para que la variable filtre todo el dashboard.

## Testing

- Backend unit: `metrics.test.ts` y `metrics.routes.test.ts` deben incluir el
  label `client` (los `.inc()` directos pasarán `client: 'dashboard'`).
- Añadir un test que verifique `clientFromRequest` (UA `HomeAssistant/x` →
  `home-assistant`; UA browser/ausente → `dashboard`).
- Verificación: `cd api && npm test && npx tsc --noEmit`.

## Fuera de alcance

- Cambios en los frontends (web o HA) para identificar el cliente (no hacen
  falta con el `User-Agent`).
- Alertas de Grafana.
- Cambios en la retención/recogida de Prometheus/Alloy.
