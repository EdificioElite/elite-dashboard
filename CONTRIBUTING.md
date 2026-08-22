# Contributing

Guía para contribuir al proyecto Edificio Elite.

## Flujo de trabajo

- **Siempre trabajar en ramas**: `feat/`, `fix/`, `docs/`, `chore/` desde `main`
- **Siempre crear PR** para mergear a `main`. Nunca push directo a `main`.
- **Siempre revisar los comentarios de Copilot en el PR** y resolver los issues que señale antes de pedir review humana. Copilot revisa automáticamente cada PR y deja comentarios inline.
- Para publicar una release, ejecutar manualmente el workflow `Release` (`.github/workflows/release.yml`)
  - Seleccionar el tipo de versión (`major`, `minor`, `patch`)
  - El workflow calcula el nuevo tag, lo crea en `main`, publica la GitHub Release y construye la imagen Docker `:X.Y.Z` y `:latest`

## Ramas protegidas

`main` requiere PR antes de merge y que pasen los checks:
`backend`, `frontend`, `e2e`

## Entornos

| Rama | Entorno | URL | Backend |
|---|---|---|---|
| `main` | Production | www.edificioelite.com | api.edificioelite.com |
| PR | Preview/Dev | dev.edificioelite.com | api-dev.edificioelite.com |

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) ejecuta en cada push y PR a `main`:
- Backend: typecheck + tests
- Frontend: tests + build
- E2E: stack docker-compose + Playwright

Release (`.github/workflows/release.yml`): workflow_dispatch manual con selector de versión:
- Calcula la siguiente versión semver desde el último tag
- Crea y pushea el tag `vX.Y.Z` en main
- Crea la GitHub Release con notas generadas automáticamente
- Publica imagen Docker `:X.Y.Z` y `:latest`

Docker PR (`.github/workflows/docker-pr.yml`): en cada PR se construye la imagen `:dev` para el entorno de preview.

## Migraciones

Las migraciones SQL viven en `api/migrations/` y se ejecutan **automáticamente** en los entornos reales (dev y prod) mediante un init-container que corre `node dist/migrate.js` con los roles dedicados `migrator` (prod) y `migrator_dev` (dev), antes de arrancar la API. `migrate.ts` registra las migraciones aplicadas en la tabla `schema_migrations` y solo aplica las pendientes.

**Reglas:**

- Los archivos de migración los **commitea el agente** para que un humano los revise antes de mergear (igual que antes).
- Los roles `migrator` / `migrator_dev` y las tablas `schema_migrations` son propios del dashboard. **Los roles y tablas de n8n (`n8nuser`, `n8n`, `contadores`, `facturas`, `facturaelectrica`, `consumos`) son de otro servicio separado: no se tocan ni se usan.**
- Roles de runtime: `dashboard_api` (prod) y `dashboard_api_dev` (dev), con mínimos privilegios.

**Setup inicial (una sola vez, manual, con superuser vía pgAdmin):**

1. Crear los roles `migrator` (prod) y `migrator_dev` (dev):

```sql
CREATE ROLE migrator LOGIN PASSWORD '<password-fuerte>';
CREATE ROLE migrator_dev LOGIN PASSWORD '<password-fuerte>';

-- Prod (conectado a 'aerotermia'):
GRANT CONNECT ON DATABASE aerotermia TO migrator;
GRANT USAGE, CREATE ON SCHEMA public TO migrator;
GRANT dashboard_api TO migrator;

-- Dev (conectado a 'aerotermia-dev'):
GRANT CONNECT ON DATABASE "aerotermia-dev" TO migrator_dev;
GRANT USAGE, CREATE ON SCHEMA public TO migrator_dev;
GRANT dashboard_api TO migrator_dev;
```

> Las migraciones hacen `ALTER TABLE ... OWNER TO dashboard_api` de forma incondicional, por eso ambos roles de migración son miembros de `dashboard_api`.

2. Baseline de migraciones ya aplicadas, en ambas BDs (`aerotermia` y `aerotermia-dev`):

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  name VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (name) VALUES
  ('001_create_usuarios.sql'),
  ('002_create_readonly_user.sql'),
  ('003_email_tokens.sql'),
  ('004_vecinos_ownership.sql'),
  ('005_add_ultima_conexion.sql'),
  ('006_add_ultima_consulta_ha.sql'),
  ('007_facturaelectrica.sql'),
  ('008_multi_usuario_por_piso.sql'),
  ('009_juntas.sql'),
  ('010_replace_is_admin_with_role.sql')
ON CONFLICT (name) DO NOTHING;
```

> El baseline evita que el init-container re-ejecute 001–010 (la `002` referencia `DATABASE elite`, nombre incorrecto; la real es `aerotermia`).

3. Los init-containers `dashboard-api-migrate` / `dashboard-api-dev-migrate` están definidos en el repo `portainer-compose` (directorio `dashboards/`), donde se configura el `DATABASE_URL` de los roles `migrator` (prod) y `migrator_dev` (dev).
