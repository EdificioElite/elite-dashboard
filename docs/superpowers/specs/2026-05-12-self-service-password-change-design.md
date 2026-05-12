# Self-Service Password Change

El usuario autenticado puede cambiar su propia contrasena desde el menu desplegable del header.

## Alcance

- Endpoint `PUT /api/auth/password` en backend (no admin, solo auth)
- Modal `SelfPasswordModal` en frontend con 3 campos
- Habilitar boton "Cambiar contrasena" en `Header.tsx`
- Validacion compartida: min 8 chars, 1 mayuscula, 1 minuscula, 1 numero

## Backend

### `PUT /api/auth/password` — `api/src/routes/auth.ts`

Protegido por `authMiddleware`, sin `adminMiddleware`.

**Request:**
```json
{ "currentPassword": "string", "newPassword": "string" }
```

**Validaciones (en orden):**

1. Ambos campos presentes → 400 si falta alguno
2. `newPassword` cumple requisitos → 400 si no:
   - Minimo 8 caracteres
   - Al menos 1 mayuscula (A-Z)
   - Al menos 1 minuscula (a-z)
   - Al menos 1 digito (0-9)
3. `currentPassword` coincide con hash en BD (bcrypt.compare) → 401 si no

**Accion:**
- Hash `newPassword` con bcrypt (12 rounds)
- `UPDATE usuarios SET password_hash = $1 WHERE id = $2` (usa `req.user.userId`)

**Rate limiting:** 5 intentos por IP por minuto (usa el mismo `rateLimit` middleware que login).

**Respuesta exitosa:** `{ message: "Contrasena actualizada" }`

**Respuesta error:** `{ error: "mensaje descriptivo" }` + status code.

## Frontend

### API client — `src/api/client.ts`

```ts
export async function changeOwnPassword(currentPassword: string, newPassword: string) {
  return apiFetch<{ message: string }>('/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
```

### Componente — `src/components/SelfPasswordModal.tsx`

Props: `{ onClose: () => void }`

- 3 inputs tipo `password`: "Contrasena actual", "Nueva contrasena", "Confirmar contrasena"
- Validacion client-side antes de enviar (mismos requisitos)
- Muestra error inline (`setError`) en la parte superior del formulario
- Loading state mientras se hace la request
- Muestra mensaje de exito y cierra el modal tras 1.5s (o similar)
- Estilo: modal overlay con fondo semitransparente, tarjeta centrada blanca, misma estetica que `ChangePasswordModal`

### Integracion Header — `src/components/Header.tsx`

- Quitar `disabled` del boton "Cambiar contrasena" (linea 110)
- Clases: `text-cocoa/70 hover:text-cocoa hover:bg-white/5` (activo, no faded)
- Estado local: `const [showPasswordModal, setShowPasswordModal] = useState(false)`
- Al hacer click: `setShowPasswordModal(true)`
- Render condicional: `{showPasswordModal && <SelfPasswordModal onClose={() => setShowPasswordModal(false)} />}`

### Store — Sin cambios

El store de auth no necesita cambios. El token sigue siendo valido tras cambiar la contrasena (JWT no incluye hash).

## Testing

### Backend tests — `api/src/__tests__/routes.test.ts`

Casos para `PUT /api/auth/password`:
- Exito: currentPassword correcto + newPassword valido → 200
- Error 400: falta currentPassword o newPassword
- Error 400: newPassword no cumple requisitos (demasiado corto, sin mayuscula, sin minuscula, sin numero)
- Error 401: currentPassword incorrecto
- Error 401: sin token (authMiddleware)
- Verificar que bcrypt.hash se llamo con la nueva password

### Frontend tests — `src/`

- `SelfPasswordModal` renderiza 3 inputs
- Muestra error si newPassword no cumple requisitos
- Muestra error si passwords no coinciden
- Llama a `changeOwnPassword` con valores correctos
- Muestra mensaje de exito tras respuesta OK
- Cierra modal al hacer click en X o backdrop

## No hacer

- No modificar `ChangePasswordModal` (admin) ni `PUT /admin/usuarios/:id/password`
- No modificar el store de auth
- No cambiar la tabla `usuarios`
- No tocar el JWT ni su contenido
