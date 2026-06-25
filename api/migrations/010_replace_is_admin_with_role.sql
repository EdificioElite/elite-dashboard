-- 010: Replace is_admin boolean with role enum
BEGIN;

ALTER TABLE usuarios ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'usuario';
UPDATE usuarios SET role = 'admin' WHERE is_admin = true;
ALTER TABLE usuarios ADD CONSTRAINT chk_role CHECK (role IN ('usuario', 'directiva', 'admin'));
ALTER TABLE usuarios DROP COLUMN is_admin;

COMMIT;
