# Descarga de facturas de aerotermia

## Objetivo

Permitir a los vecinos descargar sus facturas de aerotermia en PDF, reutilizando
el mecanismo de Google Drive ya existente para las actas de las juntas. El PDF
de cada factura se aloja en Google Drive y el backend actúa como proxy, igual
que en `/api/juntas/:id`.

## Contexto

- La tabla `facturas` es propiedad de **n8n** (solo lectura para el dashboard).
  Actualmente no tiene columna para el fichero. n8n (fuera de este repo) será
  quien suba los PDFs a Drive y rellene una nueva columna `drive_file_id`.
- El dashboard reutiliza `getPDFStream(fileId)` de `api/src/lib/googleDrive.ts`.
- La vista de vecino renderiza las facturas en `FacturasTable` (pivote: filas =
  métricas, columnas = periodos). El admin las ve en la tabla pivote de
  `AdminAerotermiaPage` (filas = pisos, columnas = periodos).
- Convención de la columna en `juntas`: `drive_file_id VARCHAR(255)` nullable,
  que **no se expone** al cliente (solo un indicador de disponibilidad).

## Requisitos

1. En la vista de vecino, añadir una fila **"Descargar"** después de la fila
   **"Total"** en `FacturasTable`. Cada celda muestra un botón de descarga solo
   si la factura tiene `drive_file_id` no nulo; en caso contrario, celda vacía.
2. En la vista admin (`AdminAerotermiaPage`), el **precio total** de cada
   factura es clicable y descarga el PDF cuando existe; si no, se muestra como
   texto plano.
3. El backend expone el PDF como stream (`Content-Type: application/pdf` +
   `Content-Disposition: attachment`).
4. El vecino solo puede descargar facturas de **su propio piso**. El
   admin/directiva puede descargar cualquier factura vía endpoint propio.

## Modelo de datos

Nueva columna en `facturas` (la crea n8n; NO se toca desde el dashboard):

```sql
ALTER TABLE public.facturas
  ADD COLUMN IF NOT EXISTS drive_file_id VARCHAR(255);
```

- `drive_file_id`: id del fichero en Google Drive, `NULL` si aún no hay PDF.
- No hace falta GRANT: `dashboard_api` y `dashboard_api_dev` ya tienen `SELECT`
  sobre `facturas`, y la columna hereda ese privilegio.
- `drive_file_id` **no se expone** al cliente; solo se devuelve el booleano
  `tiene_pdf`.

## API

| Método | Ruta | Middleware | Descripción |
|---|---|---|---|
| GET | `/api/facturas/:id_factura/descargar` | auth | Descargar factura propia (proxy Drive) |
| GET | `/api/admin/aerotermia/facturas/:id_factura/descargar` | auth + directiva/admin | Descargar cualquier factura (proxy Drive) |

### Cambios en listados existentes

- `GET /api/facturas`: añadir `(f.drive_file_id IS NOT NULL) AS tiene_pdf` al SELECT.
- `GET /api/admin/aerotermia/facturas`: añadir `(f.drive_file_id IS NOT NULL) AS tiene_pdf` al SELECT.

### GET /api/facturas/:id_factura/descargar

- Calcula el piso efectivo igual que el listado: `admin`/`directiva` con
  `?piso=` usan ese piso; si no, `req.user.vecinoPiso`.
- `SELECT piso, drive_file_id FROM facturas WHERE id_factura = $1`.
- `404` si no existe **o** si `factura.piso !== pisoEfectivo` (no revelar
  facturas ajenas).
- `404` si `drive_file_id` es null ("Esta factura no tiene archivo adjunto").
- Nombre de fichero: `factura-{id_factura}.pdf`.

### GET /api/admin/aerotermia/facturas/:id_factura/descargar

- Sin chequeo de piso (cualquier factura). `404` si no existe o sin
  `drive_file_id`. Mismo proxy y nombre de fichero.

### Métricas

Añadir a `normalizePath` de `api/src/index.ts`:
- `/api/facturas/:id_factura/descargar`
- `/api/admin/aerotermia/facturas/:id_factura/descargar`

## Frontend

### `src/api/client.ts`

- Nueva función `downloadFacturaPDF(idFactura, opts?: { admin?: boolean; piso?: string })`
  que espeja `downloadJuntaPDF` (blob + `Content-Disposition`).

### `src/components/FacturasTable.tsx`

- Interface `Factura`: añadir `tiene_pdf?: boolean`.
- Nueva prop `downloadPiso?: string` (para la vista admin "ver como piso").
- Fila "Descargar" tras "Total": botón con `Icon name="download"` si
  `f.tiene_pdf`; si no, celda vacía. Usa `downloadFacturaPDF(id_factura, { piso: downloadPiso })`.

### `src/pages/DashboardPage.tsx`

- Interface `Factura`: añadir `tiene_pdf?`.
- Pasar `downloadPiso={viewingAs ?? undefined}` a `FacturasTable`.

### `src/pages/AdminAerotermiaPage.tsx`

- Interface `FacturaGlobal`: añadir `tiene_pdf?`.
- El pivote guarda, por (piso, periodo), `importe_total`, `id_factura` y
  `tiene_pdf`. La celda del total se convierte en botón que llama a
  `downloadFacturaPDF(id_factura, { admin: true })` cuando `tiene_pdf`; si no,
  texto plano.

## Seguridad

- Vecino: solo su piso (o el piso de la vista admin). Admin/directiva: endpoint
  propio con `requireRole('directiva', 'admin')`.
- `drive_file_id` nunca se expone al cliente.

## Coordinación con n8n y Google Drive

- n8n sube los PDFs a Drive y guarda `drive_file_id` en `facturas` (fuera de
  este repo). La columna debe existir antes o a la vez que se despliegue este
  cambio; si no, los endpoints de facturas fallarían al referenciar la columna.
- Los ficheros deben ser accesibles a la credencial de Google del dashboard
  (misma carpeta compartida que Juntas, como lector); si no, `getPDFStream`
  devolverá 403 de Drive.

## Testing

- Backend (`api/src/__tests__/`):
  - `routes.test.ts` (o `facturas`): `GET /api/facturas/:id/descargar` — 404 sin
    archivo, 404 piso ajeno, 200 con stream (DB + `googleDrive` mockeados).
  - `adminAerotermia.test.ts`: `GET /api/admin/aerotermia/facturas/:id/descargar`
    — 403 no-admin, 404 sin archivo, 200 con stream.
- Frontend (`src/`):
  - `FacturasTable.test.tsx`: la fila "Descargar" muestra el botón solo cuando
    `tiene_pdf`.
  - `AdminAerotermiaPage.test.tsx`: la celda del total es clicable solo cuando
    `tiene_pdf`.

## Fuera de alcance

- Subida de PDFs desde el dashboard (lo hace n8n).
- Gestión de la carpeta de Drive de facturas (n8n).
- Descarga en la tabla `FacturaElectricaTable` (solo facturas de aerotermia por
  piso).
