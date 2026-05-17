CREATE TABLE IF NOT EXISTS facturaelectrica (
  id VARCHAR(255) NOT NULL,
  startdate DATE,
  enddate DATE,
  creationdate TIMESTAMPTZ,
  amount NUMERIC,
  facturada BOOLEAN,
  issuedate TIMESTAMPTZ,
  filename VARCHAR(255),
  fileurl VARCHAR(255),
  kwh_electricos BIGINT,
  CONSTRAINT facturaelectrica_pkey PRIMARY KEY (id)
);

-- Permisos de lectura para los usuarios del dashboard
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dashboard_api') THEN
    GRANT SELECT ON public.facturaelectrica TO dashboard_api;
  END IF;
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dashboard_api_dev') THEN
    GRANT SELECT ON public.facturaelectrica TO dashboard_api_dev;
  END IF;
END
$$;
