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
