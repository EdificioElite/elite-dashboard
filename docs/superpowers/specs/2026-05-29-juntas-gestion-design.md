# Gestion de juntas — Diseno

**Fecha:** 2026-05-29
**Estado:** Aprobado

## Proposito

Permitir a los admins crear/editar/borrar juntas (reuniones de la comunidad) con adjuntos PDF desde el dashboard. Los vecinos pueden ver la lista y descargar los PDFs. Los archivos se almacenan en Google Drive, con el backend actuando como proxy.

## Alcance

- Backend: tabla `juntas`, rutas CRUD, integracion Google Drive (upload/download/delete via service account)
- Frontend: refactorizar `JuntasGeneralesPage` de datos hardcodeados a datos reales desde API, con controles admin
- Migracion SQL: `009_juntas.sql`

No incluido:
- Paginacion (a menos que el numero de juntas lo requiera, empezamos sin ella)
- Tipos personalizados por el admin (los tipos se gestionan via codigo por ahora)

---

## Modelo de datos

```sql
CREATE TABLE juntas (
  id            SERIAL PRIMARY KEY,
  tipo          VARCHAR(50) NOT NULL,
  fecha         DATE NOT NULL,
  drive_file_id VARCHAR(255),
  file_name     VARCHAR(255),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

- `tipo`: VARCHAR (no ENUM) para permitir nuevos tipos sin migracion
- `drive_file_id`: ID del archivo en Google Drive, NULL si aun no tiene PDF
- `file_name`: nombre original del archivo subido (para referencia)

### Tipos de junta y sus abreviaturas

| Tipo en BD              | Abreviatura | Descripcion                  |
|-------------------------|-------------|------------------------------|
| `vecinal_ordinaria`     | JVO         | Junta Vecinal Ordinaria      |
| `vecinal_extraordinaria`| JVE         | Junta Vecinal Extraordinaria |
| `vocal_ordinaria`       | JDO         | Junta Directiva Ordinaria    |
| `vocal_extraordinaria`  | JDE         | Junta Directiva Extraordinaria |

Nombre de archivo en Drive: `{abreviatura}-{fecha}.pdf` (ej: `JVO-2026-05-29.pdf`)

---

## API

Archivo: `api/src/routes/juntas.ts`

| Metodo | Ruta                        | Middleware       | Descripcion                          |
|--------|-----------------------------|------------------|--------------------------------------|
| GET    | `/api/juntas`               | auth             | Listar todas las juntas              |
| GET    | `/api/juntas/:id`           | auth             | Descargar PDF (proxy desde Drive)    |
| POST   | `/api/admin/juntas`         | auth + admin     | Crear junta (multipart)              |
| PUT    | `/api/admin/juntas/:id`     | auth + admin     | Editar junta y/o reemplazar PDF      |
| DELETE | `/api/admin/juntas/:id`     | auth + admin     | Borrar junta + eliminar PDF de Drive |

### GET /api/juntas

Query params (opcional): `?tipo=vecinal_ordinaria` para filtrar.

Response:
```json
[
  {
    "id": 1,
    "tipo": "vecinal_ordinaria",
    "fecha": "2026-05-29",
    "file_name": "JVO-2026-05-29.pdf",
    "created_at": "2026-05-29T10:00:00Z",
    "updated_at": "2026-05-29T10:00:00Z"
  }
]
```

Nota: `drive_file_id` NO se expone al cliente.

### GET /api/juntas/:id

Devuelve el PDF como stream (`Content-Type: application/pdf`). Si no hay archivo, 404. Nombre del fichero en `Content-Disposition: attachment; filename="JVO-2026-05-29.pdf"`.

### POST /api/admin/juntas

Content-Type: `multipart/form-data`

Campos:
- `tipo` (string, requerido)
- `fecha` (string YYYY-MM-DD, requerido)
- `archivo` (file, opcional) — PDF

Validacion: `tipo` debe ser uno de los tipos validos. `fecha` debe ser fecha valida. `archivo` debe ser PDF (magic bytes check o mimetype).

Flujo: insertar fila en `juntas` → si hay archivo, subir a Drive con nombre `{abreviatura}-{fecha}.pdf` → guardar `drive_file_id` y `file_name`.

### PUT /api/admin/juntas/:id

Content-Type: `multipart/form-data`

Campos:
- `tipo` (string, opcional)
- `fecha` (string YYYY-MM-DD, opcional)
- `archivo` (file, opcional) — nuevo PDF

Flujo: actualizar `tipo`/`fecha` si se envían → si se envía nuevo archivo, eliminar PDF anterior de Drive (si existe), subir nuevo PDF.

Si cambia `tipo` o `fecha`, el nombre del archivo en Drive se actualiza (borrar antiguo y subir con nuevo nombre).

### DELETE /api/admin/juntas/:id

Flujo: si tiene `drive_file_id`, eliminar archivo de Drive → borrar fila de `juntas`.

---

## Google Drive

### Configuracion

Service Account de Google Cloud con acceso a una carpeta compartida de Drive.

Variables de entorno nuevas:
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- `GOOGLE_DRIVE_FOLDER_ID` (ID de la carpeta compartida donde se guardan los PDFs)

Libreria: `googleapis` (Google Drive API v3)

### Modulo: `api/src/lib/googleDrive.ts`

Funciones:
- `uploadPDF(fileBuffer: Buffer, fileName: string): Promise<string>` → devuelve `drive_file_id`
- `getPDF(fileId: string): Promise<Readable>` → devuelve stream del archivo
- `deleteFile(fileId: string): Promise<void>` → elimina archivo de Drive
- `updateFileName(fileId: string, newName: string): Promise<string>` → renombra archivo en Drive (usar en PUT)

### Autenticacion

JWT auth con Service Account (`google.auth.JWT`). No OAuth2 de usuario, es server-to-server.

---

## Frontend

### Pagina: `/juntas`

Refactorizar `src/pages/JuntasGeneralesPage.tsx`:

- Fetch de `/api/juntas` al montar
- Tabla con columnas: Tipo, Fecha, Acciones
- Boton descargar PDF (link a `/api/juntas/:id` con `target="_blank"` o `download`)
- Si no hay PDF (`file_name` es null), mostrar "-" o icono gris

### Controles admin (visible solo si `user.is_admin`)

- Boton "Crear junta" en la parte superior (dropdown o modal con form)
- Por cada fila: icono editar (lapiz) e icono borrar (papelera)
- Modal de confirmacion antes de borrar

### Modal crear/editar junta

Formulario con:
- `tipo`: dropdown con los 4 tipos (con etiquetas: "Vecinal Ordinaria", "Vecinal Extraordinaria", "Directiva Ordinaria", "Directiva Extraordinaria")
- `fecha`: input tipo date
- `archivo`: input tipo file, solo PDF, opcional (indicar "(opcional)")
- En modo edicion, mostrar archivo actual si existe, opcion de reemplazarlo

### Modal confirmacion borrado

Mismo patron que DeleteVecinoModal / DeleteUserModal: "Estas seguro de que quieres borrar esta junta?" con boton "Eliminar".

---

## Migracion

Archivo: `api/migrations/009_juntas.sql`

```sql
CREATE TABLE IF NOT EXISTS juntas (
  id            SERIAL PRIMARY KEY,
  tipo          VARCHAR(50) NOT NULL,
  fecha         DATE NOT NULL,
  drive_file_id VARCHAR(255),
  file_name     VARCHAR(255),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.juntas OWNER TO dashboard_api;

-- Permisos para dashboard_api (prod)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dashboard_api') THEN
    GRANT ALL PRIVILEGES ON TABLE public.juntas TO dashboard_api;
    GRANT USAGE, SELECT ON SEQUENCE public.juntas_id_seq TO dashboard_api;
  END IF;
END
$$;

-- Permisos para dashboard_api_dev (dev)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dashboard_api_dev') THEN
    GRANT ALL PRIVILEGES ON TABLE public.juntas TO dashboard_api_dev;
    GRANT USAGE, SELECT ON SEQUENCE public.juntas_id_seq TO dashboard_api_dev;
  END IF;
END
$$;

-- n8n no necesita acceso a esta tabla
```

---

## Testing

### Backend tests (`api/src/__tests__/`)

- `juntas.test.ts`: tests de integracion para las 5 rutas
  - GET /api/juntas — lista vacia, lista con datos
  - POST /api/admin/juntas — crear sin PDF, crear con PDF mock, error por tipo invalido, error sin auth/sin admin
  - PUT /api/admin/juntas/:id — editar tipo/fecha, reemplazar archivo
  - DELETE /api/admin/juntas/:id — borrar, error 404 si no existe
  - GET /api/juntas/:id — descargar PDF, error 404 si no tiene archivo
- `googleDrive.test.ts`: tests unitarios del modulo googleDrive (mockeando googleapis)

### Frontend tests (`src/`)

- Actualizar `JuntasGeneralesPage.test.tsx` para probar:
  - Render con datos de API (mockeada)
  - Boton crear junta visible para admin, oculto para vecino
  - Botones editar/borrar visibles para admin
  - Modal crear/editar/borrar

---

## Tareas

1. Migracion SQL `009_juntas.sql`
2. Modulo Google Drive (`api/src/lib/googleDrive.ts`)
3. Rutas API juntas (`api/src/routes/juntas.ts`)
4. Test backend juntas
5. Cliente API frontend (`apiFetch` calls en `src/api/`)
6. Refactorizar `JuntasGeneralesPage.tsx` con datos reales + controles admin
7. Tests frontend
8. Verificar build + CI
