# Ingesta de contadores en el dashboard (equivalente al workflow n8n "Lectura Contadores")

> Referencia del formato del CSV y de los equipos: [docs/datalogger-contadores.md](../datalogger-contadores.md).

## Objetivo

Reimplementar dentro de la API del dashboard el workflow de n8n `Lectura
Contadores`, que recibe el CSV del datalogger Elvaco CMe3100 con las lecturas de
los contadores Kamstrup Multical 403 y las escribe en la tabla `contadores`.
Además, verificar en cada ingesta que llegan datos de **todos** los contadores,
detectar contadores **desactualizados** y detectar **resets** (descensos del
acumulado). Sustituye a n8n (el workflow se desactiva tras validar el nuevo en
dev/prod).

## Contexto

- El datalogger hace `HTTP POST` (Basic Auth) del CSV (report template 3115,
  `Content-Type: application/octet-stream`, codificación **ISO-8859-1**, ~89 KB).
- El CSV trae una cabecera por contador + ~4 lecturas por contador, con cabeceras
  repetidas intercaladas (~40 contadores).
- Hoy el dashboard es **solo lectura** sobre `contadores` (rol `dashboard_api` con
  `SELECT`). La tabla es de `n8nuser` y es un hypertable de TimescaleDB.
- El workflow n8n transforma el CSV y hace upsert idempotente por
  `(serial_number, device_identification, created)`.

## Decisiones de diseño

- **Ubicación:** endpoint `POST /api/contadores` dentro de la API Express.
- **Auth:** Basic Auth con credencial fija en env (`CONTADORES_INGEST_USER` /
  `CONTADORES_INGEST_PASSWORD`), comparación timing-safe.
- **Permisos BD:** ampliar el rol `dashboard_api` (migración `GRANT INSERT, UPDATE`
  sobre `contadores`), mismo pool de conexiones.
- **Encoding:** decodificar el body como **latin1** (ISO-8859-1), no UTF-8.
- **Parseo:** split manual por `;` (sin dependencia CSV), módulo puro testeable.
- **Transformación:** réplica exacta de n8n (÷10 volúmenes/caudales, coma→punto en
  temperaturas, `created`→ISO UTC, 42 columnas).
- **Integridad:** `faltantes` (vs `vecinos`), `desactualizados` (por `datetime`) y
  `resets` (descenso de acumulado).
- **Seguridad:** rate limiting en la ruta + validación de credenciales al arrancar.
- **Observabilidad:** métricas + logs + heartbeat Uptime Kuma + paneles y alertas
  de Grafana.
- **Mock dev:** script que genera CSV aleatorio y lo POSTea cada ~30 min.

---

## 1. Endpoint y autenticación

- Ruta `api/src/routes/contadores.ts` → `POST /api/contadores`, montada en
  `api/src/index.ts`.
- **Basic Auth** contra `CONTADORES_INGEST_USER` / `CONTADORES_INGEST_PASSWORD`
  (nuevas variables de entorno, añadir a `api/.env.example`). Si no coincide →
  `401` (sin heartbeat, sin métrica de ingesta; los 401 ya se ven en las métricas
  HTTP por `status_code`).
- **Validación de config:** añadir `CONTADORES_INGEST_USER` /
  `CONTADORES_INGEST_PASSWORD` a `validateConfig()` en `api/src/config.ts` para
  fallo duro en producción si no están definidos (igual que `JWT_SECRET`).
- **Rate limiting:** `rateLimit(60, 5 * 60 * 1000)` (60 peticiones / 5 min, por IP;
  el datalogger manda ~1/5 min). Reutiliza `api/src/middleware/rateLimit.ts`.
- Body crudo capturado con `express.text({ type: 'application/octet-stream',
  defaultCharset: 'latin1', limit: '1mb' })` montado **solo** en esta ruta. El
  `express.json()` global no lo toca (no es JSON).

## 2. Parseo y transformación

Módulo puro `api/src/lib/contadoresIngest.ts`, sin dependencias nuevas:

- `parseContadoresCsv(raw: string): CsvRow[]` — dividir por líneas y por `;`;
  la primera línea es la cabecera (define el orden de columnas); descartar las
  líneas de cabecera repetidas (aquellas cuya primera celda `#serial-number` es
  el literal `#serial-number`).
- Extraer valores **por índice** a partir de la cabecera (normalizando el símbolo
  de grado `°`/`�` a un token canónico), para no depender del byte exacto.
- `transformRow(row): ContadorInsert` — réplica exacta de n8n:
  - `created`: `new Date(created.replace(' ','T') + 'Z').toISOString()` (hora UTC).
  - `volume_m3_*` y `volume_flow_m3h_*`: `Number(valor.replace(',','.')) / 10`.
  - `flow_temp` / `return_temp` / `diff_temp`: `Number(valor.replace(',','.'))`.
  - `energy_manufacturer_specific_02_wh_inst_value_0_0_0`: `Number(valor)`.
  - resto: string crudo (Postgres castea).
  - Insertar las mismas 42 columnas que n8n (se ignora `power_w_max_value_0_0_0`
    y `volume_flow_m3h_max_value_0_0_0`).

## 3. Escritura en BD + permisos

- Upsert atómico (una transacción, todo o nada):
  `INSERT INTO contadores (...) VALUES (...) ON CONFLICT
  (serial_number, device_identification, created) DO UPDATE SET <cols no-clave>
  = EXCLUDED.<col>`.
- Migración `api/migrations/012_grant_contadores_write.sql`:
  `GRANT INSERT, UPDATE ON public.contadores TO dashboard_api` (y
  `dashboard_api_dev`). La tabla sigue siendo de `n8nuser`; la aplica el
  init-container con el rol `migrator`.

## 4. Verificación de integridad y anomalías

Tras parsear (y antes de insertar):

- `presente` = `(device_identification, serial_number)` distintos del CSV.
- `esperado` = `SELECT DISTINCT device_identification, serial_number FROM vecinos`.
- **Faltantes** = `esperado - presente`. Gauge
  `dashboard_contadores_faltantes{device_identification}` = `1` si falta, `0` si
  está (actualizar todo el conjunto cada ingesta; `.remove()` para limpiar
  contadores dados de baja).
- **Desactualizados:** para cada contador presente, `staleness = created - datetime`
  (sobre el registro más reciente de ese contador en el batch). Si
  `staleness > CONTADORES_STALE_MINUTES` (default `120`) → gauge
  `dashboard_contadores_desactualizados{device_identification}` = `1` (si no, `0`).
- **Resets / anomalías:** detectar si un valor acumulativo **disminuye** respecto a
  la última lectura aceptada (indica sustitución o reset del contador). Antes de
  insertar, una query con `DISTINCT ON (device_identification)` devuelve la última
  lectura de cada contador presente en el batch; se compara el valor más bajo del
  batch contra ese previo en: `energy_wh_inst_value_0_0_0` (calor),
  `energy_manufacturer_specific_02_wh_inst_value_0_0_0` (frío),
  `volume_m3_inst_value_0_0_0` y `volume_m3_inst_value_0_1_0` (ACS). Cualquier
  descenso estricto → counter `dashboard_contadores_resets_total{device_identification}`
  y `logger.warn` con el detalle.
- Estos tres casos se registran en log y **no** son errores de pipeline: el
  heartbeat sigue `up`.

## 5. Observabilidad

- **Métricas** en `api/src/lib/metrics.ts`:
  - Counter `dashboard_contadores_ingest_total{outcome}` (`success` | `error`),
    una vez por POST procesado.
  - Gauge `dashboard_contadores_faltantes{device_identification}`.
  - Gauge `dashboard_contadores_desactualizados{device_identification}`.
  - Counter `dashboard_contadores_resets_total{device_identification}` (evento de
    reset detectado).
  - Gauge `dashboard_contadores_ultima_ingesta_timestamp_seconds` (epoch de la
    última ingesta OK, para alertar si deja de llegar datos).
  - (Sin label `client`: es un endpoint máquina-a-máquina, solo lo llama el datalogger.)
- **Logs:** `logger.info({ filas, faltantes, desactualizados, resets }, 'Contadores ingest success')`
  y `logger.error({ err }, 'Contadores ingest error')`.
- **Heartbeat Uptime Kuma:** al terminar con éxito → ping `status=up`; si el INSERT
  falla → `status=down`. URL en `CONTADORES_UPTIME_URL` (default la de n8n).
  Fire-and-forget (no bloquea la respuesta).
- **Grafana:** actualizar `grafana/observabilidad.json` con un panel de ingesta
  (tasa éxito/error) y un panel de integridad por contador (faltantes,
  desactualizados y resets).
- **Alertas de Grafana** (a crear en Grafana, p. ej. vía provisioning/UI):
  - "Sin ingesta": `time() - dashboard_contadores_ultima_ingesta_timestamp_seconds > 900`.
  - "Contador faltante": `dashboard_contadores_faltantes == 1` (for `5m`).
  - "Contador desactualizado": `dashboard_contadores_desactualizados == 1` (for `5m`).
  - "Reset detectado": `increase(dashboard_contadores_resets_total[5m]) > 0`.

## 6. Mock del datalogger (solo dev)

- Script `api/scripts/mock-datalogger.ts` + npm script `"mock:datalogger":
  "tsx api/scripts/mock-datalogger.ts"` en `api/package.json`.
- Genera un CSV fiel (report 3115): cabecera por contador + ~4 lecturas × 40
  contadores, con cabeceras repetidas entre bloques. Valores acumulativos crecientes
  (energía, volúmenes, on-time) y aleatorios (temperaturas, potencia, caudal),
  `datetime` = `created` + offset por contador. Siempre los 40 contadores.
- Lista de contadores (id, `device-position`, `primary-address`) hardcodeada,
  derivada de la muestra real (serial `0016045167`, ids `72569463`..`72569502`).
- POSTea a `CONTADORES_URL` (default `http://localhost:3001/api/contadores`) con
  Basic Auth, cada `MOCK_INTERVAL_MS` (default `1800000` = 30 min). `MOCK_ONCE=1`
  para una única ejecución manual.

## 7. Errores y casos borde

- `401` auth incorrecta.
- `400` body vacío / ilegible.
- Tras filtrar cabeceras, si quedan 0 filas válidas → `200 { ingested: 0 }` (sin
  heartbeat down).
- Fallo en el INSERT → `500` + heartbeat `down` + counter `outcome=error`.
- El contador ausente del CSV y el desactualizado no interrumpen la ingesta.

## 8. Testing

- **Unit:** `parseContadoresCsv` y `transformRow` con un fixture real (muestra del
  CSV). Tests de las funciones puras de verificación: faltantes, desactualizados
  (`created - datetime`) y resets (descenso de acumulado vs lectura previa).
- **Integration:** ruta `POST /api/contadores` con supertest y DB mockeada — `401`,
  éxito, body vacío, rate limit (`429`).
- Verificación: `cd api && npm test && npx tsc --noEmit`.

## 9. Despliegue / migración off n8n

- Desplegar la API con la migración `012`.
- Apuntar el datalogger al nuevo host de la API (config del CMe3100, fuera del
  repo) con las credenciales `CONTADORES_INGEST_*`.
- Validar en dev (usando el mock) y en prod, y desactivar el workflow `Lectura
  Contadores` en n8n. El workflow `API Contadores` (solo lectura) **no se toca**.

## Fuera de alcance

- El workflow n8n `API Contadores` (lectura) y `Facturacion Aerotermia`.
- Detección de contadores "extra" (presentes en el CSV pero no en `vecinos`): se
  ingieren normalmente, solo se loguean.
- **Anomalías positivas** (saltos grandes de energía sin reset): solo se detectan
  descensos (resets).
- **Backfill de huecos** vía reenvío del CMe3100 (`Report ... filter.mode=interval`):
  se documentará en un runbook aparte.
- **Corrección del timezone de `created`** (hoy se guarda como UTC con offset sin
  aplicar): requiere investigación aparte con implicaciones de migración.
- **Parseo CSV quote-aware** (soportar valores entre comillas): el formato actual no
  usa comillas; se evalúa si aparece un caso real.
