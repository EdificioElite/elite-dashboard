CREATE TABLE IF NOT EXISTS juntas (
  id            SERIAL PRIMARY KEY,
  tipo          VARCHAR(50) NOT NULL,
  fecha         DATE NOT NULL,
  drive_file_id VARCHAR(255),
  file_name     VARCHAR(255),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.juntas OWNER TO dashboard_api;

-- Permisos para dashboard_api (prod)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dashboard_api') THEN
    GRANT ALL PRIVILEGES ON TABLE public.juntas TO dashboard_api;
    GRANT USAGE, SELECT ON SEQUENCE public.juntas_id_seq TO dashboard_api;
  END IF;
END
$$;

-- Permisos para dashboard_api_dev (dev)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dashboard_api_dev') THEN
    GRANT ALL PRIVILEGES ON TABLE public.juntas TO dashboard_api_dev;
    GRANT USAGE, SELECT ON SEQUENCE public.juntas_id_seq TO dashboard_api_dev;
  END IF;
END
$$;

-- n8n no necesita acceso a esta tabla
