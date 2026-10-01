-- 012: Permitir al dashboard escribir en contadores (ingesta del datalogger).
-- La tabla sigue siendo de n8nuser; solo se amplían los permisos de escritura
-- de los roles de runtime del dashboard. La aplica el init-container con el rol
-- migrator (SUPERUSER).

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dashboard_api') THEN
    GRANT INSERT, UPDATE ON public.contadores TO dashboard_api;
  END IF;
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dashboard_api_dev') THEN
    GRANT INSERT, UPDATE ON public.contadores TO dashboard_api_dev;
  END IF;
END
$$;
