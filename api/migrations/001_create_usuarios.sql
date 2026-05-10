CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  vecino_piso VARCHAR(255) REFERENCES vecinos(piso) UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
