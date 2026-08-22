# Refresh tokens (sesion deslizante) — Diseno

**Fecha:** 2026-08-22
**Estado:** Aprobado

## Proposito

Eliminar la necesidad de re-login con usuario+contrasena cuando caduca el access token (hoy 7 dias). Se introduce un refresh token de larga duracion que renueva el access token de forma silenciosa, sin intervencion del usuario, manteniendo la sesion activa mientras el usuario siga usando la aplicacion (sesion deslizante).

## Alcance

- Backend: access token JWT pasa de `7d` a `1h`; refresh token opaco de 30 dias con rotacion, almacenado (hasheado) en una tabla nueva `refresh_tokens`.
- Backend: nuevos endpoints `POST /auth/refresh` y `POST /auth/logout`; `login` y `register` devuelven ademas `refreshToken`.
- Frontend: refresh silencioso en `apiFetch` (detectar 401, refrescar, reintentar) y almacenamiento del refresh token en el store.
- Migraciones: tracking de migraciones aplicadas en `schema_migrations` + `migrate.ts` que solo ejecuta pendientes. Ejecucion automatica via init-container con rol `migrator` dedicado.

No incluido:
- Revocacion por dispositivo / listado de sesiones activas.
- Job de limpieza de refresh tokens caducados (acumulables; se revocan en logout/rotacion).
- Refresh silencioso en `downloadJuntaPDF` ni `apiForm` (solo `apiFetch`).

---

## Modelo de tokens

| Token | Tipo | Duracion | Almacenamiento | Renovable |
|-------|------|----------|----------------|-----------|
| Access token | JWT (stateless) | 1h | `localStorage` (cliente) | Si, via refresh |
| Refresh token | Opaco (random hex 32B) | 30d | Hash SHA-256 en BD (`refresh_tokens`) | Si (rotacion) |

**Rotacion (sliding session):** cada uso del refresh token revoca el anterior y emite uno nuevo. Si un token revocado se reusa, devuelve 401 (la sesion debe re-autenticarse).

---

## Modelo de datos

```sql
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- `token_hash`: SHA-256 del token en claro (nunca se guarda el token crudo).
- `revoked_at`: marca de revocacion (logout o rotacion). NULL = activo.
- `ON DELETE CASCADE`: al borrar un usuario se eliminan sus refresh tokens.
- Propiedad: `dashboard_api` (prod) / `dashboard_api_dev` (dev), mismo patron que `email_tokens` y `juntas`.

---

## API

Archivo: `api/src/routes/auth.ts`

| Metodo | Ruta              | Middleware | Descripcion                                   |
|--------|-------------------|------------|-----------------------------------------------|
| POST   | `/api/auth/refresh` | rateLimit | Renueva access + refresh tokens (rotacion)     |
| POST   | `/api/auth/logout`  | rateLimit | Revoca el refresh token del body               |

### Cambios en endpoints existentes

- `POST /api/auth/login`: ahora devuelve `{ token, refreshToken, user }`.
- `POST /api/auth/register`: ahora devuelve `{ token, refreshToken, user }`.

### POST /api/auth/refresh

Request:
```json
{ "refreshToken": "<opaco>" }
```

Respuesta 200:
```json
{
  "token": "<access JWT 1h>",
  "refreshToken": "<nuevo opaco 30d>",
  "user": { "id": 1, "vecino_piso": "1A", "email": "a@a.com", "role": "usuario" }
}
```

Errores:
- 400 si falta `refreshToken`.
- 401 si el refresh token es invalido, expirado, revocado, o el usuario ya no existe.

Flujo: hash del token → lookup → validar (no revocado, no expirado) → revocar anterior → crear nuevo → emitir access token + user.

### POST /api/auth/logout

Request: `{ "refreshToken": "<opaco>" }` (opcional). Revoca ese refresh token. Respuesta 200 siempre.

---

## Libreria: `api/src/lib/refreshTokens.ts`

- `generateRefreshToken(): string` — random 32 bytes hex.
- `hashRefreshToken(token: string): string` — SHA-256 hex.
- `createRefreshToken(userId: number): Promise<string>` — inserta hash + `expires_at = now + 30d`.
- `verifyRefreshToken(raw: string): Promise<RefreshTokenData | null>` — lookup + validacion.
- `rotateRefreshToken(raw: string): Promise<RotatedRefreshToken | null>` — verify + revoke + create nuevo.
- `revokeRefreshToken(raw: string): Promise<void>` — marca `revoked_at`.

---

## Frontend

### Cliente: `src/api/client.ts`

- `apiFetch` detecta `401` (salvo en endpoints de auth) y, si hay refresh token, hace refresh silencioso (con dedupe via promesa compartida) y reintenta la peticion original una vez.
- Endpoints excluidos del refresh: `/auth/login`, `/auth/refresh`, `/auth/register`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`.
- Si el refresh falla, limpia `token` y `refreshToken` de `localStorage` y lanza error.
- `localStorage` keys: `token` (access) y `refreshToken` (refresh).

### Store: `src/store/auth.ts`

- Estado nuevo: `refreshToken`.
- `login` / `registerFromInvite`: guardan `token` y `refreshToken`.
- `logout`: dispara `POST /auth/logout` (fire-and-forget), limpia ambos tokens.
- `checkAuth`: si hay `token` o `refreshToken`, llama a `/auth/me`; el refresh silencioso de `apiFetch` maneja la renovacion. Si falla, limpia ambos y desloguea.

---

## Migraciones automaticas

### Tracking

`migrate.ts` crea (si no existe) la tabla `schema_migrations` (`name` PK, `applied_at`) y solo ejecuta los `.sql` de `api/migrations/` cuyo nombre no este ya registrado.

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  name VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Baseline (una vez, manual)

Las migraciones 001–010 ya estan aplicadas en prod/dev. Para que el nuevo `migrate.ts` no intente re-aplicarlas (la `002` referencia `DATABASE elite`, nombre incorrecto; la real es `aerotermia`), se insertan como ya aplicadas en ambas BDs (`aerotermia` y `aerotermia-dev`) antes del primer arranque automatico.

### Rol `migrator` (una vez, manual)

Rol dedicado cluster-wide con permisos minimos para DDL + ceder ownership + otorgar grants:

```sql
CREATE ROLE migrator LOGIN PASSWORD '<generar-fuerte>';
-- por BD (aerotermia y aerotermia-dev):
GRANT CONNECT ON DATABASE <db> TO migrator;
GRANT USAGE, CREATE ON SCHEMA public TO migrator;
-- roles cluster-wide:
GRANT dashboard_api TO migrator;
GRANT dashboard_api_dev TO migrator;
```

La API de runtime sigue usando `dashboard_api` / `dashboard_api_dev` (minimos privilegios).

### Init-container

Servicio one-shot `dashboard-api-migrate` en `docker-compose.yml` y `docker-compose.dev.yml` que ejecuta `node dist/migrate.js` con `DATABASE_URL` del rol `migrator`, y `dashboard-api` espera `service_completed_successfully`.

---

## Migracion

Archivo: `api/migrations/011_refresh_tokens.sql` (tabla `refresh_tokens` + grants a `dashboard_api`/`dashboard_api_dev`, patron identico a `003_email_tokens.sql`).

---

## Testing

### Backend (`api/src/__tests__/`)

- `jwt.test.ts`: actualizar el test de expiracion a ~1h.
- `refreshTokens.test.ts`: unitarios de create/verify/rotate/revoke (DB mockeada).
- `routes.test.ts`: integracion de `/auth/refresh` y `/auth/logout`; login/register devuelven `refreshToken`.

### Frontend (`src/`)

- `client.test.ts`: `apiFetch` reintenta tras 401 con refresh; limpia tokens si el refresh falla; no refresca en endpoints de auth.
- `auth.test.ts`: store guarda/limpia `refreshToken`; `checkAuth` con solo refresh token.

---

## Tareas

1. Migracion `011_refresh_tokens.sql`
2. Reducir expiracion access token a 1h
3. Libreria `refreshTokens.ts` + tests
4. Endpoints `/auth/refresh` y `/auth/logout` + devolver refreshToken en login/register
5. `migrate.ts` con tracking
6. Frontend: refresh silencioso en `apiFetch`
7. Frontend: store con refreshToken
8. Verificacion completa (backend + frontend)
9. INFRA manual: rol `migrator`, baseline, servicio `migrate` en compose
