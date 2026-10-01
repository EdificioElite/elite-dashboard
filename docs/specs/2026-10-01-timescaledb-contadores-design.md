# Compresión y retención de `contadores` con TimescaleDB — Design

## Objetivo

1. Que los datos ocupen menos disco.
2. Que las consultas sean (o sigan siendo) rápidas.
3. Retención de datos de **5 años** (hoy solo hay ~1,2 años acumulados).
4. Que las consultas actuales (Grafana y dashboard web) sigan funcionando con la
   **granularidad actual** (lecturas crudas, sin downsampling).
5. Que Grafana siga consultando igual que ahora.

## Finalidad y base jurídica

- **Finalidad**: estudio de consumos y diagnóstico de problemas de la instalación
  de aerotermia/ACS (comparación interanual, detección de derivas o averías).
- **Base jurídica**: interés legítimo de la comunidad (art. 6.1.f RGPD). Los
  titulares de los datos son los propios vecinos, beneficiarios del servicio.
- **Plazo de conservación**: 5 años, justificado por la necesidad de series
  largas para el análisis multi-anual.

## Contexto

- **Tabla `contadores`** (n8n, solo lectura para el dashboard): ~4,9 M filas,
  ~2,8 GB, ~11.500 filas/día (~8/min), creciendo ~2,3 GB/año.
- **TimescaleDB `2.30.1-pg17`** (imagen oficial, features completas) ya instalado,
  pero `contadores` es una **tabla normal** (no hypertable). Nunca se le hizo
  `create_hypertable`.
- **n8n** escribe con `upsert` las lecturas de los **últimos 15 minutos** (4
  lecturas por contador: minuto 0, -5, -10, -15). Es un **único datalogger** que
  centraliza todo: si falla, el dato se pierde (no hay backfill de días atrás).
  Peor caso real de retraso: ~15 min.
- **Grafana** (datasource `aerotermia`, Postgres con `timescaledb: true`) consulta
  `contadores` con `$__timeGroupAlias` (→ `time_bucket`) + `MAX(...)` +
  `GROUP BY device_position, device_identification` y
  `WHERE device_identification = ANY(...)`.
- **Dashboard web** consulta vía API (`/api/consumos`, `/api/consumo-actual`), con
  agregaciones sobre `contadores`. Estas queries usan
  `ct.serial_number::text = v.serial_number`, que depende del índice
  `idx_contadores_did_sn_created` (expresión sobre `serial_number::text`).
- PK de `contadores`: `(device_identification, serial_number, created)` — incluye
  la columna de tiempo, requisito cumplido para hypertable.

## Decisión de diseño

**Enfoque A: conversión in-place a hypertable + compresión lossless + retención.**

- Convertir `contadores` a hypertable (partición por `created`).
- Habilitar compresión **lossless** (preserva el 100 % de la granularidad cruda;
  no hay downsampling). Se decidió conservar la granularidad cruda durante los
  3 años completos.
- Política de retención a 5 años.
- No se añaden continuous aggregates (YAGNI: la compresión ya cubre espacio y
  velocidad, y los agregados romperían la granularidad cruda).

## Configuración

| Parámetro | Valor | Justificación |
|---|---|---|
| `chunk_time_interval` | `7 days` | ~80.000 filas/chunk; buen pruning y granularidad de compresión/retención |
| `compress_segmentby` | `device_identification, device_position` | columnas de filtro/agrupación de Grafana |
| `compress_orderby` | `created DESC` | orden temporal |
| Lag de compresión | `7 days` | seguro: peor caso de escritura atrasada es 15 min |
| Retención | `5 years` | dropea chunks de más de 5 años (hoy no borra nada) |

## Runbook de ejecución

### Paso 0 — Pre-checks

```sql
SELECT extname, extversion FROM pg_extension WHERE extname = 'timescaledb';
SELECT count(*), pg_size_pretty(pg_total_relation_size('contadores')) FROM contadores;
```

Disco libre en el host: verificar `df -h /opt/aerothermal/timescale/data`
(la migración necesita ~2x el tamaño de la tabla temporalmente).

### Paso 1 — Backup (justo antes de migrar)

`pg_dump -Fc` de `contadores` + verificar restauración en una BD de prueba
(`SELECT count(*)` coherente). Rehacerlo inmediatamente antes del Paso 3, porque
n8n sigue escribiendo.

### Paso 2 — Probar en `aerotermia-dev`

Ejecutar los comandos del Paso 3 en la BD de dev para validar el flujo.

### Paso 3 — Conversión en prod (ventana de mantenimiento)

```sql
-- 3.1 hypertable (reescribe ~2,8 GB; lock de escritura unos minutos)
SELECT create_hypertable('contadores', 'created',
  chunk_time_interval => INTERVAL '7 days');

-- 3.2 compresión
ALTER TABLE contadores SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'device_identification, device_position',
  timescaledb.compress_orderby = 'created DESC'
);
SELECT add_compression_policy('contadores', INTERVAL '7 days');

-- 3.3 retención
SELECT add_retention_policy('contadores', INTERVAL '5 years');
```

Riesgo de lock bajo: n8n envía cada ~5 min y reenvía los últimos 15 min en cada
ciclo, así que las lecturas bloqueadas se recuperan en el siguiente envío.

### Paso 4 — Verificación

```sql
SELECT hypertable_name, num_dimensions
FROM timescaledb_information.hypertables WHERE hypertable_name = 'contadores';

SELECT range_start, range_end, is_compressed
FROM timescaledb_information.chunks
WHERE hypertable_name = 'contadores' ORDER BY range_start;

SELECT job_id, proc_name, config, scheduled
FROM timescaledb_information.jobs WHERE hypertable_name = 'contadores';
```

Verificación funcional forzando la compresión de un chunk viejo (sin esperar al
scheduler):

```sql
SELECT compress_chunk(c) FROM show_chunks('contadores', older_than => INTERVAL '7 days') c LIMIT 1;
```

Luego comprobar:

- **Grafana**: panel "Consumos Contadores" devuelve datos en un rango que incluya
  el chunk comprimido.
- **Dashboard web**: `GET /api/consumos` y `GET /api/consumo-actual` devuelven
  datos correctos.

### Paso 5 — Rollback (solo si algo falla)

El `pg_dump` restaura `contadores` como tabla normal (estado pre-conversión):

```sql
DROP TABLE contadores;
-- luego pg_restore del dump
```

(o restaurar el dump en una BD limpia y hacer swap).

## Fuera de alcance

- Corregir el cast `ct.serial_number::text = v.serial_number` del dashboard (se
  analizó y no aporta ganancia: la query ya usa un índice y va a ~2,3 ms).
- Dropear `idx_contadores_did_sn_created`: las queries del dashboard dependen de
  él. Solo sería redundante si además se corrigiera el cast (tarea separada).
- Continuous aggregates / downsampling.
- Alertas o cambios en Grafana.
