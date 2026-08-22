-- 011: Refresh tokens para sesión deslizante
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.refresh_tokens OWNER TO dashboard_api;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dashboard_api') THEN
    GRANT ALL PRIVILEGES ON TABLE public.refresh_tokens TO dashboard_api;
    GRANT USAGE, SELECT ON SEQUENCE public.refresh_tokens_id_seq TO dashboard_api;
  END IF;
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dashboard_api_dev') THEN
    GRANT ALL PRIVILEGES ON TABLE public.refresh_tokens TO dashboard_api_dev;
    GRANT USAGE, SELECT ON SEQUENCE public.refresh_tokens_id_seq TO dashboard_api_dev;
  END IF;
END;
$$;
