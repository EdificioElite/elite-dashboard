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

CREATE INDEX IF NOT EXISTS idx_email_tokens_type_email ON email_tokens(type, email);
CREATE INDEX IF NOT EXISTS idx_email_tokens_type_piso ON email_tokens(type, piso);
