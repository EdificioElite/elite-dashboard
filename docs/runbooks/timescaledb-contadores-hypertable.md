# Runbook: convertir `contadores` a hypertable (compresión + retención)

> Operación manual sobre la tabla `contadores` (propiedad de n8n, solo lectura
> para el dashboard). No se modifica código del dashboard ni de n8n.
> Ejecutar como superusuario (o rol propietario de n8n) en la BD `aerotermia`.

## 0. Pre-checks

```sql
SELECT extname, extversion FROM pg_extension WHERE extname = 'timescaledb';
SELECT count(*), pg_size_pretty(pg_total_relation_size('contadores')) FROM contadores;
```

Disco libre en el host: `df -h /opt/aerothermal/timescale/data` (la migración
necesita ~2x el tamaño de la tabla temporalmente).

## 1. Backup (justo antes de migrar)

```bash
pg_dump -h 192.168.20.50 -p 5432 -U n8nuser -d aerotermia \
  -t public.contadores -Fc -f contadores_backup_$(date +%F).dump
```

Verificar restauración en una BD de prueba (`aerotermia_restore_check`) y
`SELECT count(*)` coherente. Rehacerlo inmediatamente antes del paso 3, porque
n8n sigue escribiendo (~8 filas/min).

## 2. Probar en `aerotermia-dev`

Ejecutar el script en la BD de dev para validar el flujo:
`docs/runbooks/timescaledb-contadores-hypertable.sql`.

## 3. Ejecutar en prod (ventana de mantenimiento)

Ejecutar `docs/runbooks/timescaledb-contadores-hypertable.sql` en `aerotermia`.

> El `create_hypertable` reescribe ~2,8 GB y toma lock de escritura unos
> minutos. n8n envía cada ~5 min y reenvía los últimos 15 min, así que las
> lecturas bloqueadas se recuperan en el siguiente envío.

## 4. Verificación

```sql
SELECT hypertable_name, num_dimensions
FROM timescaledb_information.hypertables WHERE hypertable_name = 'contadores';

SELECT range_start, range_end, is_compressed
FROM timescaledb_information.chunks
WHERE hypertable_name = 'contadores' ORDER BY range_start;

SELECT job_id, proc_name, config, scheduled
FROM timescaledb_information.jobs WHERE hypertable_name = 'contadores';
```

Forzar la compresión de un chunk viejo (sin esperar al scheduler):

```sql
SELECT compress_chunk(c) FROM show_chunks('contadores', older_than => INTERVAL '7 days') c LIMIT 1;
```

Comprobar:
- **Grafana**: panel "Consumos Contadores" devuelve datos en un rango que
  incluya el chunk comprimido.
- **Dashboard web**: `GET /api/consumos` y `GET /api/consumo-actual` devuelven
  datos correctos.

## 5. Rollback (solo si algo falla)

```sql
DROP TABLE contadores;
```

Y luego `pg_restore` del dump (restaura `contadores` como tabla normal,
estado pre-conversión).
