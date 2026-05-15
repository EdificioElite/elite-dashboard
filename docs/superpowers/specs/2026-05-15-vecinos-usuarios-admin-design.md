# Spec: Separacion limpia vecinos/usuarios + admin panel completo

**Fecha:** 2026-05-15
**Estado:** Aprobado
**PR relacionado:** #29 (permisos de vecinos y email_tokens)

## Contexto

Actualmente hay friccion entre las tablas `vecinos` y `usuarios`:
- Ambas tienen un campo `email` con propositos distintos pero la UI los confunde
- El admin panel solo permite editar `vecinos.email`, no el resto de campos
- Los permisos estaban rotos (`dashboard_api` sin UPDATE sobre `vecinos`)
- La tabla `email_tokens` no existia en produccion ni tenia permisos

## Objetivo

1. Separar claramente `vecinos.email` (facturas, n8n) de `usuarios.email` (login)
2. Permitir editar **todos** los campos de `vecinos` desde el panel admin
3. Permitir crear usuarios **sin piso** (admin de fincas, junta de gobierno)
4. n8n sigue leyendo `vecinos` sin cambios

## Modelo de datos final

```
vecinos (owner: dashboard_api)
─────────────────────────────
piso                   PK, VARCHAR
nombre                 VARCHAR
email                  VARCHAR   ← email para facturas (n8n lee)
device_identification  VARCHAR
serial_number          VARCHAR
coeficiente            VARCHAR
enviar_email           BOOLEAN
password_hash          TEXT      ← legacy n8n, no se usa en dashboard

usuarios (owner: dashboard_api)
────────────────────────────────
id                     PK, SERIAL
vecino_piso            VARCHAR, FK→vecinos.piso, NULLABLE
email                  VARCHAR, UNIQUE NOT NULL  ← email para login
password_hash          VARCHAR, NOT NULL
is_admin               BOOLEAN, DEFAULT false
created_at             TIMESTAMP, DEFAULT NOW()
```

- `usuarios.vecino_piso` ya es NULLABLE en la migracion 001 (no tiene NOT NULL, solo REFERENCES + UNIQUE). PostgreSQL permite multiples NULL en UNIQUE. Sin cambios de schema necesarios.
- Permisos: `dashboard_api` / `dashboard_api_dev` es owner de ambas tablas. `n8nuser` / `n8nuser_dev` tiene SELECT sobre `vecinos`. `n8nuser` sin acceso a `usuarios`.

## Estrategia de migraciones (dev vs prod)

Ambos entornos usan los mismos archivos SQL en `api/migrations/`. Las diferencias de roles se manejan con bloques condicionales `DO $$ IF EXISTS`:

- **`dashboard_api`** (prod) / **`dashboard_api_dev`** (dev): los GRANTs se aplican a ambos roles si existen
- **`n8nuser`** (prod) / **`n8nuser_dev`** (dev): mismo enfoque
- Ejemplo: `GRANT SELECT ON vecinos TO n8nuser;` + `GRANT SELECT ON vecinos TO n8nuser_dev;` cada uno dentro de `IF EXISTS`

Migraciones existentes a actualizar con este patron:
| Archivo | Cambio |
|---------|--------|
| `002_create_readonly_user.sql` | Añadir `dashboard_api_dev` y `n8nuser_dev` donde corresponda |
| `003_email_tokens.sql` | Añadir `dashboard_api_dev` a los GRANTs |
| `004_vecinos_ownership.sql` | Añadir `dashboard_api_dev` al OWNER TO y `n8nuser_dev` al GRANT |

## Cambios en API

### `PUT /admin/vecinos/:piso` — ampliar campos aceptados

**Antes:** solo acepta `{ email }`

**Despues:** acepta body parcial con cualquiera de:
```json
{
  "nombre": "string (opcional)",
  "email": "string (opcional)",
  "coeficiente": "string (opcional)",
  "enviar_email": "boolean (opcional)",
  "device_identification": "string (opcional)",
  "serial_number": "string (opcional)"
}
```
Solo actualiza los campos presentes en el body. Requiere al menos un campo.

### `DELETE /admin/vecinos/:piso` — eliminar vecino (nuevo)

Permite eliminar un vecino del edificio. Borra la fila en `vecinos`. Si hay un `usuario` asociado, el `vecino_piso` del usuario queda en NULL (no se hace CASCADE delete de usuarios).

### `POST /admin/vecinos` — crear vecino (nuevo)

Permite dar de alta un nuevo vecino en el edificio. Requiere `piso`. El resto de campos opcionales.

### `POST /admin/usuarios` — vecino_piso opcional

**Antes:** `vecino_piso` obligatorio

**Despues:** `vecino_piso` opcional. Si no se envia, el usuario se crea sin asociacion a ningun vecino (usuario global, tipicamente admin).

## Cambios en frontend (AdminPage.tsx)

### Tabla de vecinos

| Columna actual | Cambio |
|----------------|--------|
| Piso | Sin cambios |
| Nombre | Sin cambios |
| Email (`v.email` → `usuarios.email`) | Renombrar cabecera a "Email login" |
| Rol (Admin/Vecino) | Sin cambios |
| Acciones (invitar/editar email) | Redisenar |

### Nuevas acciones por fila

- **Icono editar vecino** (lapiz): abre modal con todos los campos de `vecinos` (nombre, email facturas, coeficiente, enviar_email, device_identification, serial_number)
- **Icono email facturas** (sobre): si `vecinos.email` existe → boton de invitar. Si no → boton "Sin email facturas" con icono de editar inline (solo el campo email)
- **Icono usuario** (persona): si tiene `user_id` → boton de editar usuario. Si no → placeholder vacio

### Formulario "Crear acceso"

- Campo piso: pasar de obligatorio a opcional
- Si se deja vacio → se crea usuario sin `vecino_piso` (usuario global)

## No cambia

- n8n workflow de envio de facturas (lee `vecinos.email`)
- Login, registro, recuperar contrasena, resetear contrasena
- Flujo de invitacion (sigue usando `vecinos.email`)
- Pagina de dashboard del vecino (sigue filtrando por `usuarios.vecino_piso`)
- `n8nuser` permisos (SELECT sobre `vecinos`, sin acceso a `usuarios`)
