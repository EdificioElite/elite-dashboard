# Conversión de `contadores` a hypertable + compresión + retención — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preparar el script SQL idempotente y el runbook para convertir la tabla `contadores` (de n8n) en hypertable de TimescaleDB, habilitar compresión lossless y definir políticas de compresión (7 días) y retención (5 años).

**Architecture:** Dos archivos de documentación/operación en `elite-dashboard`: un script SQL idempotente y un runbook paso a paso. No se modifica código del dashboard ni de n8n; la operación es manual (la ejecuta el humano contra la BD `aerotermia`).

**Tech Stack:** TimescaleDB `2.30.1-pg17` (Postgres 17), pgAdmin, `pg_dump`/`pg_restore`.

---

## File Structure

- Create: `docs/runbooks/timescaledb-contadores-hypertable.sql` — script idempotente.
- Create: `docs/runbooks/timescaledb-contadores-hypertable.md` — runbook operativo.

---

### Task 1: Script SQL idempotente

**Files:**
- Create: `docs/runbooks/timescaledb-contadores-hypertable.sql`

- [ ] **Step 1: Crear la rama de trabajo**

```bash
git checkout -b chore/timescaledb-contadores
```

- [ ] **Step 2: Escribir el script SQL**

Crear `docs/runbooks/timescaledb-contadores-hypertable.sql` con el siguiente contenido:

```sql
-- Convierte `contadores` (tabla de n8n) en hypertable de TimescaleDB,
-- habilita compresión lossless y define políticas de compresión y retención.
-- Idempotente: se puede re-ejecutar sin duplicar políticas.
--
-- Ejecutar como superusuario (o rol propietario de n8n) en la BD `aerotermia`.
-- Previamente: hacer backup (pg_dump -Fc) y verificar restauración.

-- 1. Hypertable (solo si aún no lo es)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM timescaledb_information.hypertables
    WHERE hypertable_schema = 'public' AND hypertable_name = 'contadores'
  ) THEN
    PERFORM create_hypertable(
      'contadores', 'created',
      chunk_time_interval => INTERVAL '7 days',
      migrate_data => true
    );
  END IF;
END $$;

-- 2. Habilitar compresión (idempotente)
ALTER TABLE contadores SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'device_identification, device_position',
  timescaledb.compress_orderby = 'created DESC'
);

-- 3. Política de compresión (comprime chunks de más de 7 días)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM timescaledb_information.jobs
    WHERE hypertable_schema = 'public'
      AND hypertable_name = 'contadores'
      AND proc_name = 'policy_compression'
  ) THEN
    PERFORM add_compression_policy('contadores', INTERVAL '7 days');
  END IF;
END $$;

-- 4. Política de retención (dropea chunks de más de 5 años)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM timescaledb_information.jobs
    WHERE hypertable_schema = 'public'
      AND hypertable_name = 'contadores'
      AND proc_name = 'policy_retention'
  ) THEN
    PERFORM add_retention_policy('contadores', INTERVAL '5 years');
  END IF;
END $$;
```

- [ ] **Step 3: Validar sintaxis del archivo SQL**

Verificar que no hay errores obvios de sintaxis (la validación real es ejecutarlo en dev, ver runbook):

```bash
grep -nE "create_hypertable|add_compression_policy|add_retention_policy|compress_segmentby|compress_orderby" docs/runbooks/timescaledb-contadores-hypertable.sql
```

Expected: lista las líneas de los 5 elementos clave sin errores.

- [ ] **Step 4: Commit**

```bash
git add docs/runbooks/timescaledb-contadores-hypertable.sql
git commit -m "chore: añadir script idempotente para hypertable de contadores"
```

---

### Task 2: Runbook operativo

**Files:**
- Create: `docs/runbooks/timescaledb-contadores-hypertable.md`

- [ ] **Step 1: Escribir el runbook**

Crear `docs/runbooks/timescaledb-contadores-hypertable.md` con el siguiente contenido:

````markdown
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
````

- [ ] **Step 2: Commit**

```bash
git add docs/runbooks/timescaledb-contadores-hypertable.md
git commit -m "docs: añadir runbook de conversión a hypertable de contadores"
```

---

## Self-Review

- **Spec coverage:** script idempotente (Task 1) cubre hypertable + compresión +
  retención; runbook (Task 2) cubre pre-checks, backup, dev, prod, verificación
  y rollback. El "fuera de alcance" del spec (cast, índice redundante, aggregates)
  no requiere tarea.
- **Placeholder scan:** sin TBD/TODO; todo el contenido (SQL y markdown) está
  completo.
- **Type/consistencia:** parámetros (`chunk_time_interval=7 days`,
  `segmentby=device_identification, device_position`, `orderby=created DESC`,
  lag `7 days`, retención `5 years`) coinciden exactamente con el spec.
