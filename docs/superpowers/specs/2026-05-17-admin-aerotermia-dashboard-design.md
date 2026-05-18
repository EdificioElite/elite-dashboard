# Spec: Admin Aerotermia Dashboard

> Fecha: 2026-05-17
> Rama: `feat/admin-aerotermia-dashboard`
> Ruta: `/admin/aerotermia`

## Objetivo

Sustituir el placeholder "Proximamente" en `AdminAerotermiaPage.tsx` por un dashboard completo con datos agregados de todo el edificio, incluyendo graficas de distribucion, consumos por vecino, selector de facturas, historico y heatmap.

## Secciones del Dashboard

### 1. Header
- **Eyebrow**: "Panel de administracion" (se mantiene)
- **Titulo**: "Aerotermia Admin" (cambia de "Aerotermia Global")
- **Subtitulo**: se mantiene ("Dashboard general de consumos y facturas del edificio.")

### 2. Filtro de fechas + Stats generales
- **SegmentedControl** con presets: 24h / 7 dias / 30 dias / 1 ano
- **Inputs datetime-local** para rango personalizado (mismo patron que `HistoricoCharts`)
- **4 stat cards** en grid `grid-cols-2 md:grid-cols-4`:
  - Total kWh calor
  - Total kWh frio
  - Total m3 ACS
  - Total euros facturados en el periodo
- Las stats se recalculan al cambiar el rango de fechas

### 3. Pie Chart: Distribucion por vecino
- **Recharts PieChart** con % del total que representa cada vecino
- Tooltip: piso, kWh totales, %, euros
- Datos desde `/api/admin/aerotermia/consumos?desde=&hasta=`
- Leyenda con piso y porcentaje

### 4. Consumo por vecino (BarChart)
- **Recharts BarChart** con barras agrupadas (calor/frio/ACS) por piso
- Eje X: pisos (ordenados por piso)
- Eje Y: kWh
- Tooltip con desglose por tipo (calor/frio/ACS)
- Colores: `var(--calor)`, `var(--frio)`, `var(--sage)`

### 5. Selector de factura + detalle por vecino
- **Dropdown/select** con facturas disponibles (por periodo/id)
- Al seleccionar una factura, tabla con columnas:
  - Piso, kWh Calor, kWh Frio, kWh ACS, m3 ACS, Importe Total
- Fuente: `GET /api/admin/aerotermia/facturas/:id_factura`

### 6. Historico de consumos totales
- Reutiliza el patron de `HistoricoCharts` con endpoint de datos agregados
- Tres LineCharts: calor total, frio total, ACS total del edificio
- Mismo comportamiento de rango de fechas que la seccion 2
- Endpoint: `GET /api/admin/aerotermia/consumos?desde=&hasta=`

### 7. Facturas (StackedBar)
- Reutiliza el patron de `FacturasChart` pero con datos de todo el edificio
- Barras apiladas por tipo (calor/frio/ACS) con importe total
- Una barra por periodo de facturacion
- Endpoint: `GET /api/admin/aerotermia/facturas`

### 8. Heatmap mensual por piso
- Tabla/grilla con pisos en filas y meses en columnas
- Cada celda coloreada por intensidad de consumo (escala de color)
- Tooltip al hover con valor exacto
- Permite detectar patrones estacionales y anomalias
- Datos desde `GET /api/admin/aerotermia/facturas` (datos mensuales por piso)

## Backend: Nuevos Endpoints

| Endpoint | Metodo | Auth | Descripcion |
|----------|--------|------|-------------|
| `/api/admin/aerotermia/consumos?desde=&hasta=` | GET | Admin | Consumos agregados de todo el edificio (suma de todos los vecinos por timestamp). Mismo formato que `/consumos` pero sin filtrar por piso. |
| `/api/admin/aerotermia/facturas` | GET | Admin | Todas las facturas de todos los vecinos. Agrupadas por id_factura, incluyendo totales y per-piso. |
| `/api/admin/aerotermia/facturas/:id_factura` | GET | Admin | Desglose por vecino de una factura concreta (piso, kWh calor/frio/ACS, m3, importe). |
| `/api/admin/vecinos/:piso/facturas` | GET | Admin | **Endpoint faltante** usado por `AdminConsumoPage`. Facturas de un vecino especifico. |

### Logica SQL

`/api/admin/aerotermia/consumos`:
- Agrega contadores de todos los vecinos (une vecinos + contadores sin WHERE piso)
- Suma los deltas por timestamp agrupando por datetime_inst_value_0_0_0
- Mismo sampling (max 500 puntos) que `/consumos`

`/api/admin/aerotermia/facturas`:
- `SELECT * FROM facturas ORDER BY fecha_factura_creacion DESC`
- Agrupacion logica por id_factura en frontend o backend

`/api/admin/aerotermia/facturas/:id_factura`:
- `SELECT * FROM facturas WHERE id_factura = $1 ORDER BY piso`
- Devuelve todas las filas (una por piso) de esa factura

`/api/admin/vecinos/:piso/facturas`:
- Misma logica que `/facturas` pero recibe piso por parametro en lugar de JWT
- `SELECT ... FROM facturas WHERE piso = $1 ORDER BY fecha_factura_creacion DESC`

## Componentes Nuevos

| Componente | Ubicacion | Descripcion |
|------------|-----------|-------------|
| `PieChartCard` | `src/components/PieChartCard.tsx` | PieChart con distribucion por vecino |
| `ConsumoVecinosChart` | `src/components/ConsumoVecinosChart.tsx` | BarChart agrupado por piso |
| `FacturaSelector` | `src/components/FacturaSelector.tsx` | Dropdown + tabla detalle factura |
| `HeatmapChart` | `src/components/HeatmapChart.tsx` | Heatmap mensual por piso |

## No incluido (pendiente)

- **COP (Coeficiente de rendimiento)**: requiere columna `kwh_electricos BIGINT` en tabla `facturaelectrica` (gestionada por n8n). Se anadira en futura iteracion cuando los datos esten disponibles.

## Convenciones

- TypeScript strict mode
- Tailwind CSS, sin CSS custom
- Patrones glass card, stagger animation, eyebrow tipografia
- Recharts para todas las graficas
- Commits en espanol con conventional commits
