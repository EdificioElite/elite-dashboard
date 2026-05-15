# Spec: Admin CRUD separado Vecinos / Usuarios

**Fecha:** 2026-05-15
**Estado:** Aprobado
**PR relacionado:** #29

## Contexto

Actualmente el admin tiene una sola pagina mezclada (`/admin`) donde se listan vecinos y usuarios en una misma tabla con acciones mixtas. Queremos separar en dos pantallas independientes con CRUD completo para cada entidad.

## Rutas

| Ruta | Pagina | Descripcion |
|------|--------|-------------|
| `/admin` | Redirect | Redirige a `/admin/vecinos` |
| `/admin/vecinos` | VecinosPage | CRUD completo de vecinos |
| `/admin/usuarios` | UsuariosPage | CRUD completo de usuarios |
| `/admin/vecino/:piso` | AdminConsumoPage | (existe) Consumo de un vecino |
| `/admin/aerotermia` | AdminAerotermiaPage | Placeholder dashboard global |

## Header

Cuando el usuario es admin:
- Se elimina el boton "Admin" actual
- Se añaden "Vecinos", "Usuarios" y "Aerotermia" (admin) como enlaces en la barra de navegacion, junto a los existentes (Inicio, Aerotermia, Juntas, Contactos)

## VecinosPage (`/admin/vecinos`)

Tabla con columnas: Piso, Nombre, Email facturas, Coeficiente, Acciones

**Botones por fila:**
- Ver aerotermia (icono chart) → navega a `/admin/vecino/:piso`
- Editar (icono edit) → abre EditVecinoModal
- Eliminar (icono trash) → abre DeleteVecinoModal

**Botones globales:**
- "Crear vecino" → formulario inline para dar de alta un vecino nuevo

## UsuariosPage (`/admin/usuarios`)

Tabla con columnas: Email, Piso, Rol, Acciones

**Botones por fila:**
- Editar (icono edit) → abre EditUserModal (ya existe)
- Cambiar contraseña (icono key) → abre ChangePasswordModal (ya existe)
- Eliminar (icono trash) → abre DeleteUserModal (ya existe)

**Botones globales:**
- "Crear acceso" → formulario inline con piso opcional (ya implementado)

## DeleteVecinoModal (nuevo componente)

Popup de confirmacion al eliminar vecino:

- Si tiene usuario asociado: muestra email del usuario + 3 botones:
  - "Eliminar vecino y usuario"
  - "Solo desvincular" (el usuario se queda sin piso)
  - "Cancelar"
- Si no tiene usuario: muestra confirmacion simple + 2 botones:
  - "Eliminar"
  - "Cancelar"

Recibe como props: `piso`, `userEmail` (string | null), `onClose`, `onDeleted`.

## AdminAerotermiaPage (nuevo, placeholder)

Pagina con Header y contenido placeholder:
- Titulo: "Aerotermia Global"
- Subtitulo: "Dashboard general de consumos y facturas del edificio"
- Cuerpo: texto centrado "Proximamente"

## Componentes afectados

| Archivo | Accion |
|---------|--------|
| `src/pages/AdminPage.tsx` | Eliminar o convertir en redirect |
| `src/pages/VecinosPage.tsx` | Crear (nuevo) |
| `src/pages/UsuariosPage.tsx` | Crear (nuevo) |
| `src/pages/AdminAerotermiaPage.tsx` | Crear (nuevo, placeholder) |
| `src/components/Header.tsx` | Añadir links condicionales Vecinos/Usuarios/Aerotermia(admin), quitar boton Admin |
| `src/components/EditVecinoModal.tsx` | (ya existe) |
| `src/components/DeleteVecinoModal.tsx` | Crear (nuevo) |
| `src/components/EditUserModal.tsx` | (ya existe, puede necesitar ajustes) |
| `src/App.tsx` | Actualizar rutas |

## No cambia

- API routes (ya implementadas en PR #29)
- Dashboard del vecino (`/aerotermia`)
- Otras paginas (Inicio, Juntas, Contactos)
- Auth, login, registro
