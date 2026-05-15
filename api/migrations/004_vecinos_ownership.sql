-- Transferir propiedad de vecinos al dashboard
-- El dashboard es responsable de vecinos; n8nuser solo lee
ALTER TABLE IF EXISTS public.vecinos OWNER TO dashboard_api;

-- Dar permiso de solo lectura a n8nuser para que siga pudiendo consultar vecinos
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'n8nuser') THEN
    GRANT SELECT ON public.vecinos TO n8nuser;
  END IF;
END
$$;
