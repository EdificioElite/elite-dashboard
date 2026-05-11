# Dashboard Redesign — Mayo 2026

## Resumen

Rediseño del dashboard del vecino con 5 cambios principales:
1. Tarjeta "En vivo" con deltas mensuales y columna de Estado
2. 3 gráficas históricas separadas (Calor, Frio, ACS) con control de tiempo compartido
3. Gráfica de facturas con barras apiladas y tooltip detallado
4. Header con navegación a secciones y dropdown de usuario
5. Corrección de alineación en tabla de facturas

---

## 1. Header + Navegación

**Archivo:** `src/components/Header.tsx`

- Links de navegación: `En vivo` · `Calor` · `Frio` · `ACS` · `Facturas`
- Cada link hace `scrollIntoView({ behavior: 'smooth' })` al `id` de la sección
- El botón "Salir" actual desaparece del header
- Avatar circular con iniciales: al hacer clic abre dropdown con:
  - Email (texto no interactivo)
  - "Cambiar contraseña" (deshabilitado, placeholder)
  - "Salir" (color `#a3402a`, ejecuta `logout()`)
- Dropdown se cierra con click outside (listener en `document`) + tecla Escape
- Los botones "Admin" / "Mi dashboard" se mantienen como están

**IDs de secciones en DashboardPage:**
- `#envivo` — ConsumoCard
- `#calor` — primera gráfica histórica
- `#frio` — segunda gráfica histórica
- `#acs` — tercera gráfica histórica
- `#facturas` — FacturasChart + FacturasTable

---

## 2. Tarjeta "En vivo" (`ConsumoCard`)

**Archivo:** `src/components/ConsumoCard.tsx`

- Layout: 4 columnas en grid (`grid-cols-4`)
- Columna 1-3: Calor / Frio / ACS con:
  - Valor principal + unidad (Fraunces 28px, color de categoría)
  - Delta desde día 1 del mes a las 00:00 (mismo color, opacidad reducida, siempre positivo)
- Columna 4: Estado con:
  - Puntito verde (encendido) o gris (apagado) + potencia en W
  - Impulsión y Retorno debajo

**Nuevos campos en la interfaz `ConsumoActual`:**
```ts
kwh_calor_mes_inicio: number;  // valor del dia 1 del mes a las 00:00
kwh_frio_mes_inicio: number;
m3_acs_mes_inicio: number;
```

**API:** Extender `GET /api/consumo-actual` para devolver los valores del día 1 del mes a las 00:00 (usando `LAG` o subquery con `date_trunc('month')`).

---

## 3. Gráficas históricas separadas

**Nuevo archivo:** `src/components/HistoricoCharts.tsx`

- Una sola card glass con eyebrow "Histórico"
- `SegmentedControl` + inputs `datetime-local` compartidos arriba
- 3 gráficas apiladas verticalmente dentro de la misma card:
  - **Calor**: `LineChart`, línea roja `#c0392b`, `dataKey="kwh_calor"`, dominio Y dinámico
  - **Frio**: `LineChart`, línea azul `#5b8ba0`, `dataKey="kwh_frio"`, dominio Y dinámico
  - **ACS**: `LineChart`, línea verde `#6f8a5c` discontinua, `dataKey="m3_acs"`, dominio Y dinámico
- Cada gráfica tiene su label con puntito de color encima
- Tooltip igual que el actual (fondo oscuro, texto crema)
- Altura: ~120px cada gráfica, sin leyenda (el label de arriba ya identifica)

**Se elimina** `ConsumoChart.tsx` (reemplazado por `HistoricoCharts.tsx`).

**API:** `/consumos` sin cambios. Los datos se pasan a las 3 sub-gráficas.

---

## 4. Facturas

### 4a. Gráfica de barras apiladas

**Nuevo archivo:** `src/components/FacturasChart.tsx`

- `BarChart` de Recharts con `<BarStack>`
- Una barra por mes/factura
- 3 segmentos apilados (importes parciales):
  - Calor: `#c0392b`
  - Frio: `#5b8ba0`
  - ACS: `#6f8a5c`
- Sin selector de rango — muestra todas las facturas
- Tooltip personalizado (mismo estilo oscuro que el histórico):

```
Abril 2026
● Calor       172,50 EUR
● Frio         72,00 EUR
● ACS          81,00 EUR
kWh calor     1,250
kWh frio        340
kWh ACS         420
m³ ACS          3,2
――――――――――――――――
Total        325,50 EUR
```

### 4b. Tabla de facturas

**Archivo:** `src/components/FacturasTable.tsx`

- Corrección: columna "Importe" alineada a la derecha con `text-right` consistente
- El resto sin cambios

**API:** `/facturas` sin cambios.

---

## 5. API — Cambios

### `GET /api/consumo-actual` (extender)

Añadir al response:
```json
{
  "kwh_calor": 12.34,
  "kwh_frio": 3.21,
  "m3_acs": 0.120,
  "kwh_acs": 5.58,
  "kwh_calor_mes_inicio": 9.13,
  "kwh_frio_mes_inicio": 2.76,
  "m3_acs_mes_inicio": 0.117,
  "temp_impulsion": 42.0,
  "temp_retorno": 32.0,
  "power_w": 150,
  "timestamp": "..."
}
```

Los campos `*_mes_inicio` se obtienen con una subquery que busca el registro más cercano a `date_trunc('month', NOW())`.

**Archivos a modificar:**
- `api/src/routes/consumos.ts` — endpoint `/consumo-actual`
- `src/api/client.ts` — sin cambios
- `src/components/ConsumoCard.tsx` — interfaz `ConsumoActual` + renderizado de deltas
- `src/components/ConsumoCard.test.tsx` — añadir tests de deltas

---

## 6. DashboardPage — Reorganización

**Archivo:** `src/pages/DashboardPage.tsx`

Orden de secciones:
1. Greeting (sin cambios)
2. `<ConsumoCard data={consumoActual} />` — `id="envivo"`
3. `<HistoricoCharts />` — `id="graficas"` con anchors `#calor`, `#frio`, `#acs`
4. `<FacturasChart data={facturas} />` — `id="facturas"`
5. `<FacturasTable data={facturas} />` — mismo `id="facturas"`

---

## 7. Archivos afectados

| Archivo | Acción |
|---------|--------|
| `src/components/Header.tsx` | Modificar: nav links + dropdown |
| `src/components/ConsumoCard.tsx` | Modificar: 4 columnas + deltas |
| `src/components/HistoricoCharts.tsx` | **Nuevo**: 3 gráficas en una card |
| `src/components/ConsumoChart.tsx` | **Eliminar** |
| `src/components/FacturasChart.tsx` | **Nuevo**: barras apiladas |
| `src/components/FacturasTable.tsx` | Modificar: alineación importe |
| `src/pages/DashboardPage.tsx` | Modificar: reorganizar + IDs |
| `api/src/routes/consumos.ts` | Modificar: extender `/consumo-actual` |
| `src/components/ConsumoCard.test.tsx` | Modificar: tests de deltas |
| `src/components/ConsumoChart.test.tsx` | **Eliminar** |
| `e2e/specs/dashboard.spec.ts` | Modificar: nuevos textos |
| `e2e/specs/date-range.spec.ts` | Modificar: adaptar a HistoricoCharts |
| `design.md` | Actualizar sección Dashboard del vecino |

---

## 8. No cambios

- `api/src/routes/consumos.ts` endpoint `/consumos` — sin cambios
- `api/src/routes/facturas.ts` — sin cambios
- `src/pages/AdminPage.tsx` — sin cambios
- `src/pages/AdminVecinoPage.tsx` — ConsumoChart se reemplaza por HistoricoCharts
- `src/components/SegmentedControl.tsx` — sin cambios
