-- Crear usuario de solo lectura para la API del dashboard
-- El dashboard solo lee datos de las tablas gestionadas por n8n
-- y tiene control total sobre su propia tabla usuarios

-- Crear los roles (ajustar password en produccion)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dashboard_api') THEN
    CREATE ROLE dashboard_api WITH LOGIN PASSWORD 'change-this-password-in-production';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dashboard_api_dev') THEN
    CREATE ROLE dashboard_api_dev WITH LOGIN PASSWORD 'change-this-password-in-dev';
  END IF;
END
$$;

-- Permisos de solo lectura sobre tablas de n8n
GRANT CONNECT ON DATABASE elite TO dashboard_api;
GRANT CONNECT ON DATABASE elite TO dashboard_api_dev;
GRANT USAGE ON SCHEMA public TO dashboard_api;
GRANT USAGE ON SCHEMA public TO dashboard_api_dev;

-- Lectura sobre tablas n8n (datos de vecinos, contadores, facturas)
GRANT SELECT ON public.vecinos TO dashboard_api;
GRANT SELECT ON public.vecinos TO dashboard_api_dev;
GRANT SELECT ON public.contadores TO dashboard_api;
GRANT SELECT ON public.contadores TO dashboard_api_dev;
GRANT SELECT ON public.facturas TO dashboard_api;
GRANT SELECT ON public.facturas TO dashboard_api_dev;

-- La tabla usuarios es gestionada por el dashboard (migraciones, inserciones)
ALTER TABLE IF EXISTS public.usuarios OWNER TO dashboard_api;
GRANT ALL PRIVILEGES ON TABLE public.usuarios TO dashboard_api;
GRANT ALL PRIVILEGES ON TABLE public.usuarios TO dashboard_api_dev;
GRANT USAGE, SELECT ON SEQUENCE public.usuarios_id_seq TO dashboard_api;
GRANT USAGE, SELECT ON SEQUENCE public.usuarios_id_seq TO dashboard_api_dev;

-- El dashboard necesita actualizar el email de vecinos para enviar invitaciones
GRANT UPDATE (email) ON public.vecinos TO dashboard_api;
GRANT UPDATE (email) ON public.vecinos TO dashboard_api_dev;

-- Permisos por defecto para futuras tablas que cree dashboard_api
ALTER DEFAULT PRIVILEGES FOR ROLE dashboard_api IN SCHEMA public
  GRANT ALL PRIVILEGES ON TABLES TO dashboard_api;
ALTER DEFAULT PRIVILEGES FOR ROLE dashboard_api IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO dashboard_api;
ALTER DEFAULT PRIVILEGES FOR ROLE dashboard_api_dev IN SCHEMA public
  GRANT ALL PRIVILEGES ON TABLES TO dashboard_api_dev;
ALTER DEFAULT PRIVILEGES FOR ROLE dashboard_api_dev IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO dashboard_api_dev;
