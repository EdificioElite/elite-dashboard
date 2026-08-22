-- 010: Replace is_admin boolean with role enum
BEGIN;

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'usuario';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'is_admin') THEN
    UPDATE usuarios SET role = 'admin' WHERE is_admin = true;
    ALTER TABLE usuarios DROP COLUMN is_admin;
  END IF;
END $$;

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS chk_role;
ALTER TABLE usuarios ADD CONSTRAINT chk_role CHECK (role IN ('usuario', 'directiva', 'admin'));

COMMIT;
