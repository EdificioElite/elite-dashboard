# Invitar usuarios con popup + múltiples usuarios por vivienda

## Objetivo

1. Reemplazar el formulario inline de "Crear acceso" en UsuariosPage por un popup modal (estilo ChangePasswordModal)
2. Permitir múltiples usuarios por vivienda (varios usuarios pueden compartir vecino_piso)
3. Eliminar el campo password del flujo de creación: solo se envía un email con token de invitación

## DB: Migración

Archivo: `api/migrations/007_multi_usuario_por_piso.sql`

```sql
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_vecino_piso_key;
```

La FK a `vecinos(piso)` se mantiene. La columna `vecino_piso` ya permite NULL.

## Backend

### `POST /admin/usuarios` — convertir a endpoint de invitación

- **Antes:** recibía `{ email, password, vecino_piso? }`, creaba usuario con bcrypt
- **Ahora:** recibe `{ email, vecino_piso? }`, crea email_token de tipo invite y envía email
- Validación: email requerido. Si vecino_piso viene, validar que existe en `vecinos`
- Respuesta: `{ message: 'Invitación enviada correctamente' }`
- Sin rate limiting (ya se quitó en cambio anterior el rate limiting de register/verify-token; mantener consistencia quitándolo también aquí)

### `POST /admin/invitar` — quitar bloqueo de usuario existente

- Quitar las líneas 347-351 (el check `existingUser` que devuelve 409 si ya existe usuario para ese piso)
- El resto del endpoint sigue igual

### `POST /auth/register` — quitar bloqueo de usuario existente

- Quitar las líneas 192-195 (el check `existing` que devuelve 409 si ya existe usuario para ese piso)
- El resto sigue igual

### `sendInviteEmail` — piso opcional

- El parámetro `piso` pasa a ser `piso?: string`
- Si hay piso: "Hola vecino del piso X" (como ahora)
- Si no hay piso: "Hola" / mensaje genérico

### `POST /admin/usuarios` — rate limiting

- El endpoint actual no tenía rate limiting explícito (se aplicaba solo al crear usuario). Al transformarlo en endpoint de invitación, se mantiene sin rate limiting para ser consistente con el cambio anterior en verify-token/register. El admin ya está autenticado con JWT.

## Frontend

### Nuevo componente: `src/components/InviteUserModal.tsx`

- Basado en `ChangePasswordModal.tsx` (mismo patrón: createPortal, modal-backdrop, modal-panel, Escape, click fuera)
- Estados: email, vecinoPiso, error, saving, success (con auto-dismiss a los 4s)
- Piso: selector cargado vía `GET /admin/vecinos` al montar el modal
- Submit: llama a `POST /admin/usuarios` con `{ email, vecino_piso }`
- Muestra feedback de éxito o error

### Modificar: `src/pages/UsuariosPage.tsx`

- Eliminar: `showForm`, `email`, `password`, `vecinoPiso`, `formError`, `formSuccess`
- Añadir: `showInviteModal`
- El botón "Crear acceso" abre `InviteUserModal`
- Eliminar el bloque `{showForm && (...)}` (formulario inline)
- Pasar `fetchUsuarios` como `onSaved` callback

### `src/api/client.ts`

- Añadir función `inviteUser(email: string, vecinoPiso?: string)`

## Testing

- Actualizar tests de integración de `POST /admin/usuarios` para el nuevo comportamiento (invitación en vez de creación directa)
- Actualizar tests de integración de `POST /admin/invitar` y `POST /auth/register` (ya no rechazan usuario existente)
- Test unitario de `InviteUserModal`
