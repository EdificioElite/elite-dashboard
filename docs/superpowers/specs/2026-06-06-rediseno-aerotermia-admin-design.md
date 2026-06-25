# Rediseño Dashboard Aerotermia Admin

**Fecha:** 2026-06-06
**Rama:** feat/aerotermia-admin-dashboard

## Resumen

Rediseño completo del dashboard de aerotermia para administradores (`/admin/aerotermia`), reorganizando las cards, añadiendo una nueva card de datos globales en vivo, y reemplazando visualizaciones existentes.

## Estructura final de la página

```
┌─────────────────────────────────────────┐
│ 1. Aerotermia Global en Vivo (NUEVA)    │  ← polling 30s, no depende del rango
├─────────────────────────────────────────┤
│ 2. Dashboards de vecinos (REDISEÑADA)   │  ← no depende del rango
├─────────────────────────────────────────┤
│ 3. DateRangeControls                    │  ← controla el rango de 4,5,6,7
├─────────────────────────────────────────┤
│ 4. Histórico global                     │  ← filtrado por rango
├─────────────────────────────────────────┤
│ 5. Facturas (REDISEÑADA)                │  ← filtrado por rango
├─────────────────────────────────────────┤
│ 6. COP y factura eléctrica              │  ← filtrado por rango
├─────────────────────────────────────────┤
│ 7. Heatmap                              │  ← filtrado por rango
└─────────────────────────────────────────┘
```

**Eliminado:** KPI (Total kWh calor/frío/ACS/facturado), Distribución por piso (PieChartCard + ConsumoVecinosChart).

---

## 1. Aerotermia Global en Vivo (NUEVA)

### Descripción

Card glass que agrega en tiempo real los datos de todos los vecinos con contador. Similar a `ConsumoCard` del vecino pero con datos globales.

### Layout

5 columnas responsivas: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`

| Columna | Contenido |
|---|---|
| Calefacción | `kwh_calor_abs` (kWh) + delta mensual `+X desde inicio mes` |
| Refrigeración | `kwh_frio_abs` (kWh) + delta mensual |
| ACS | `m3_acs_abs` (m³) + delta mensual |
| Climatización | Badge con modo (Calefacción/Refrigeración/Desconocido) + temp impulsión media |
| Temperaturas | Máx/Mín impulsión, Máx/Mín retorno |

### Colores

- Calefacción: `--calor` (#B53228)
- Refrigeración: `--frio` (#4A7A8C)
- ACS: `--sage` (#5D7A4A)
- Badge calefacción: fondo #fef2f2, texto #B53228
- Badge refrigeración: fondo #eff6ff, texto #3b82f6
- Badge desconocido: fondo #f3f4f6, texto #6b7280

### Comportamiento

- Polling cada 30s con `setInterval` + `useEffect`
- El modo climatización se determina por la temperatura de impulsión media: >29°C = calefacción, <21°C = refrigeración
- Sin datos: muestra "Esperando datos de los contadores..."

### API

**Nuevo endpoint:** `GET /api/admin/aerotermia/en-vivo`

- Auth: `authMiddleware` + `adminMiddleware`
- Toma la última lectura de cada vecino (particionada por piso, ordenada por `created DESC`), agrega con SUM/AVG/MAX/MIN
- Calcula el delta mensual: diferencia entre última lectura y primera del mes actual para cada vecino, suma total

**Respuesta:**
```json
{
  "timestamp": "2026-06-06T14:05:22Z",
  "kwh_calor_abs": 12450.6,
  "kwh_frio_abs": 6180.2,
  "m3_acs_abs": 245.6,
  "kwh_calor_mes_inicio": 342.1,
  "kwh_frio_mes_inicio": 89.3,
  "m3_acs_mes_inicio": 12.3,
  "temp_impulsion_avg": 42.0,
  "temp_impulsion_max": 48.2,
  "temp_impulsion_min": 35.1,
  "temp_retorno_avg": 33.5,
  "temp_retorno_max": 38.6,
  "temp_retorno_min": 28.3,
  "modo": "calefaccion",
  "power_w_total": 2850
}
```

### SQL

```sql
WITH latest AS (
  SELECT DISTINCT ON (v.piso)
    v.piso,
    ct.created AS timestamp,
    ct.energy_wh_inst_value_0_0_0 / 1000.0 AS kwh_calor_abs,
    ct.energy_manufacturer_specific_02_wh_inst_value_0_0_0 / 1000.0 AS kwh_frio_abs,
    ct.volume_m3_inst_value_0_1_0 AS m3_acs_abs,
    ct.flow_temp_c_inst_value_0_0_0 AS temp_impulsion,
    ct.return_temp_c_inst_value_0_0_0 AS temp_retorno,
    ct.power_w_inst_value_0_0_0 AS power_w
  FROM contadores ct
  JOIN vecinos v ON ct.device_identification = v.device_identification
    AND ct.serial_number::text = v.serial_number
  ORDER BY v.piso, ct.created DESC
),
first_of_month AS (
  SELECT DISTINCT ON (v.piso)
    v.piso,
    ct.energy_wh_inst_value_0_0_0 / 1000.0 AS kwh_calor_start,
    ct.energy_manufacturer_specific_02_wh_inst_value_0_0_0 / 1000.0 AS kwh_frio_start,
    ct.volume_m3_inst_value_0_1_0 AS m3_acs_start
  FROM contadores ct
  JOIN vecinos v ON ct.device_identification = v.device_identification
    AND ct.serial_number::text = v.serial_number
  WHERE ct.created >= date_trunc('month', NOW())
  ORDER BY v.piso, ct.created ASC
)
SELECT
  MAX(l.timestamp) AS timestamp,
  ROUND(SUM(l.kwh_calor_abs)::numeric, 1) AS kwh_calor_abs,
  ROUND(SUM(l.kwh_frio_abs)::numeric, 1) AS kwh_frio_abs,
  ROUND(SUM(l.m3_acs_abs)::numeric, 3) AS m3_acs_abs,
  ROUND(SUM(l.kwh_calor_abs - COALESCE(f.kwh_calor_start, l.kwh_calor_abs))::numeric, 1) AS kwh_calor_mes_inicio,
  ROUND(SUM(l.kwh_frio_abs - COALESCE(f.kwh_frio_start, l.kwh_frio_abs))::numeric, 1) AS kwh_frio_mes_inicio,
  ROUND(SUM(l.m3_acs_abs - COALESCE(f.m3_acs_start, l.m3_acs_abs))::numeric, 3) AS m3_acs_mes_inicio,
  ROUND(AVG(l.temp_impulsion)::numeric, 2) AS temp_impulsion_avg,
  ROUND(MAX(l.temp_impulsion)::numeric, 2) AS temp_impulsion_max,
  ROUND(MIN(l.temp_impulsion)::numeric, 2) AS temp_impulsion_min,
  ROUND(AVG(l.temp_retorno)::numeric, 2) AS temp_retorno_avg,
  ROUND(MAX(l.temp_retorno)::numeric, 2) AS temp_retorno_max,
  ROUND(MIN(l.temp_retorno)::numeric, 2) AS temp_retorno_min,
  ROUND(SUM(l.power_w)::numeric, 1) AS power_w_total
FROM latest l
LEFT JOIN first_of_month f ON l.piso = f.piso
```

El modo se calcula en el servidor con los mismos umbrales que `/consumo-actual`:
- `temp_impulsion_avg > 29` → `calefaccion`
- `temp_impulsion_avg < 21` → `refrigeracion`
- resto → `desconocido`

---

## 2. Dashboards de vecinos (REDISEÑADA)

### Descripción

Card glass con links a los dashboards individuales de cada vecino. Se mueve desde el interior de la sección Facturas al principio de la página (posición 2).

### Layout

- Buscador (input text) arriba, filtra en tiempo real por piso
- Grid de 4 columnas fijas: `grid-cols-4` (siempre 4, incluso en móvil)
- Sin labels de planta (el primer carácter del piso ya indica la planta)
- Cada botón: pill redondeado (rounded-lg), borde sutil, hover con borde accent + sombra

### Hover

- `border-accent/20` → `border-accent/25`
- `bg-cream/30` → `bg-accent/5`
- `translateY(-1px)` + `shadow-sm`

### Comportamiento

- El buscador filtra `pisosUnicos` con `includes()` (case-insensitive)
- Si no hay resultados: mensaje "Sin resultados"

### Datos

Usa `pisosUnicos` ya calculado de `filteredFacturas`. No necesita API nueva.

---

## 3. DateRangeControls

Sin cambios. Controla el rango de fechas para las cards 4, 5, 6, 7.

---

## 4. Histórico global

Sin cambios. Ya usa `/admin/aerotermia/consumos` con datos agregados (potencia = media, contador = suma acumulada).

---

## 5. Facturas (REDISEÑADA)

### Descripción

Se elimina `FacturasChart` y el filtro por piso. Se sustituye por una tabla pivote donde:
- **Filas:** pisos
- **Columnas:** periodos de factura (mes/año)
- **Celdas:** importe total (€) de ese piso en ese periodo

### Layout

- Scroll horizontal (`overflow-x-auto`) con columna de piso sticky a la izquierda
- Columnas ordenadas por fecha descendente (más reciente primero)
- Filas ordenadas por piso (A, B, C, D dentro de cada planta)
- Totales por columna en la última fila (opcional)

### Estilo

- Celdas numéricas alineadas a la derecha, formato moneda española
- Header de columna: mes y año en formato corto (ej. "ene 26")
- Columna piso: fondo cream, sticky left-0

### Datos

Usa `filteredFacturas` ya existente. Se pivota en el frontend con `useMemo`.

---

## 6. COP y factura eléctrica

Sin cambios.

---

## 7. Heatmap

Sin cambios.

---

## Componentes afectados

### Nuevos
- `GlobalEnVivoCard.tsx` — componente para la card 1
- `GET /api/admin/aerotermia/en-vivo` — endpoint backend

### Modificados
- `AdminAerotermiaPage.tsx` — reestructuración completa de la página
- `adminAerotermia.ts` (backend) — nuevo endpoint

### Eliminados de AdminAerotermiaPage
- Sección KPI (líneas 278-305)
- Sección Distribución por piso (líneas 307-315)
- `PieChartCard`, `ConsumoVecinosChart` (imports)
- `FacturasChart` (dentro de facturas)
- `pisoFacturas` state y filtro por piso
- `stats` useMemo
- `pieData` useMemo
- `vecinosConsumo` useMemo

### Sin cambios
- `DateRangeControls.tsx`
- `HistoricoCharts.tsx`
- `CopChart.tsx`
- `FacturaElectricaTable.tsx`
- `HeatmapChart.tsx`
- `adminAerotermia.ts` endpoints existentes

---

## Testing

- Test unitario para `GlobalEnVivoCard` (estados: loading, con datos, sin datos, polling)
- Test unitario para la tabla pivote de facturas
- Actualizar tests de `AdminAerotermiaPage` (eliminar aserciones de KPI/Pie/ConsumoVecinosChart)
- Test de integración para el nuevo endpoint `/admin/aerotermia/en-vivo`
- E2E: verificar que la card global carga, el buscador de vecinos funciona, la tabla de facturas se ve
