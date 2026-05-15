CREATE TABLE IF NOT EXISTS email_tokens (
  id SERIAL PRIMARY KEY,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  piso VARCHAR(255),
  type VARCHAR(20) NOT NULL CHECK (type IN ('invite', 'reset')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.email_tokens OWNER TO dashboard_api;

CREATE INDEX IF NOT EXISTS idx_email_tokens_type_email ON email_tokens(type, email);
CREATE INDEX IF NOT EXISTS idx_email_tokens_type_piso ON email_tokens(type, piso);

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dashboard_api') THEN
    GRANT ALL PRIVILEGES ON TABLE public.email_tokens TO dashboard_api;
    GRANT USAGE, SELECT ON SEQUENCE public.email_tokens_id_seq TO dashboard_api;
  END IF;
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dashboard_api_dev') THEN
    GRANT ALL PRIVILEGES ON TABLE public.email_tokens TO dashboard_api_dev;
    GRANT USAGE, SELECT ON SEQUENCE public.email_tokens_id_seq TO dashboard_api_dev;
  END IF;
END
$$;
