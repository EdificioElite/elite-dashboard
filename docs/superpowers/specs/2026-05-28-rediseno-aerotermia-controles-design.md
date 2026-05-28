# Rediseno de pagina /aerotermia — Controls de fecha + reordenar cards

**Fecha:** 2026-05-28
**Rama:** feat/rediseno-aerotermia-controles

## Objetivo

Mejorar la UX de la pagina `/aerotermia` (DashboardPage) y `/admin/aerotermia` (AdminAerotermiaPage):

1. Mover la card "En Vivo" (ConsumoCard) a la primera posicion, justo debajo de los controles de periodo
2. Reemplazar los controles de fecha actuales (presets como botones sueltos + inputs `datetime-local` nativos) por un componente unificado y atractivo

## Alcance

### Paginas afectadas
- `src/pages/DashboardPage.tsx` — `/aerotermia` (vecino)
- `src/pages/AdminAerotermiaPage.tsx` — `/admin/aerotermia` (admin)

### Componentes nuevos
- `src/components/DateRangeControls.tsx` — componente reutilizable de seleccion de rango

### Componentes existentes modificados
- `DashboardPage.tsx` — reordenar cards, usar DateRangeControls, default 30d
- `AdminAerotermiaPage.tsx` — usar DateRangeControls, mantiene default 3m
- `HistoricoCharts.tsx` — sin cambios (ya recibe `desde`/`hasta` como props externos y oculta sus controles internos)

## Diseno del componente DateRangeControls

### Props

```ts
interface DateRangeControlsProps {
  preset: Preset | null;
  desdeInput: string;
  hastaInput: string;
  onPresetChange: (preset: Preset) => void;
  onDesdeChange: (value: string) => void;
  onHastaChange: (value: string) => void;
  onApply: () => void;
}
```

Donde `Preset = '24h' | '7d' | '30d' | '3m' | '1a'`.

### Layout

**Fila unica** dentro de un contenedor `glass`:

```
| PERIODO | [24h] [7d] [30d] [3m] [1a] | | [calendar-icon] 28 abr — 28 may 2026 |
  eyebrow   segmented pill (reutiliza        boton "Personalizado"
            SegmentedControl existente)       muestra rango como texto
```

- Separador vertical sutil (`1px solid rgba(30,20,10,.06)`) entre el segmented pill y el boton de rango custom
- Padding del contenedor: `p-[14px]` o similar (mas compacto que el `p-[26px]` actual)
- Usa las clases CSS existentes: `glass`, `segmented-track`, `segmented-pill`, `segmented-option`

### Popover (rango personalizado)

Al hacer click en el boton "Personalizado":

- Aparece un popover posicionado debajo del boton (alineado a la derecha)
- Estilo glass: `background: rgba(255,251,245,.97)`, `backdrop-filter: blur(16px)`, `border-radius: 16px`, `box-shadow: 0 8px 32px rgba(30,20,10,.12)`
- Contenido:
  - Label + input `type="datetime-local"` para "Desde"
  - Label + input `type="datetime-local"` para "Hasta"
  - Boton "Aplicar" (usa clase `btn btn-primary` existente)
- Cierra al hacer click fuera (onClickOutside) o al pulsar "Aplicar"
- Al pulsar "Aplicar": ejecuta `onApply` y cierra el popover

### Comportamiento

1. **Default:** Al montar, el preset activo es el que recibe via props (30d para vecino, 3m para admin)
2. **Preset click:** Llama a `onPresetChange(preset)`, que actualiza el segmented pill y las fechas via `applyPreset()`
3. **Custom click:** Abre el popover. El segmented pill se deselecciona visualmente (ningun preset activo)
4. **Al abrir el popover:** Los inputs de fecha se pre-rellenan con los valores actuales de `desdeInput`/`hastaInput`
5. **Al cerrar sin aplicar:** Se descartan los cambios del popover (el estado no se modifica)
6. **Boton "Personalizado":** Muestra el rango actual formateado como `"28 abr — 28 may 2026"` (formato corto, solo dia y mes abreviado + ano)
7. **Popover abierto:** Click fuera cierra sin aplicar cambios

### Formateo del rango

Si hay fechas validas en `desdeInput`/`hastaInput`, el boton muestra:
```
{desdeFormateada} — {hastaFormateada}
```
Formato: `d MMM yyyy` en espanol (ej: "28 abr 2026"). Si las fechas son del mismo ano, omitir el ano en la primera:
```
28 abr — 28 may 2026
```

## Cambios en DashboardPage.tsx

1. **Importar DateRangeControls** en lugar de los presets manuales + inputs
2. **Default preset: `'30d'`** (actual: `'1a'`)
3. **Reordenar el stagger:**
   ```
   DateRangeControls
   ConsumoCard (En Vivo) ← movido a posicion 1
   HistoricoCharts
   FacturasChart
   FacturasTable
   Home Assistant
   ```
4. **Eliminar** el bloque actual de `div.flex.flex-col.sm:flex-row...` con presets + inputs — reemplazado por `<DateRangeControls />`

## Cambios en AdminAerotermiaPage.tsx

1. **Importar DateRangeControls**
2. **Mantener default: `'3m'`** (sin cambios en el comportamiento)
3. **Reemplazar** el bloque de presets + inputs (lineas 270-301) por `<DateRangeControls />`
4. El resto de la pagina no cambia — sections, KPI, charts, etc.

## No se modifica

- `HistoricoCharts.tsx` — cuando recibe `desde`/`hasta` como props externos, ya oculta sus controles internos. Funciona correctamente.
- `SegmentedControl.tsx` — el componente existente ya tiene el diseno de pill que necesitamos. Se reutiliza tal cual via sus props `options`, `value`, `onChange`.
- `src/lib/dates.ts` — las funciones `applyPreset`, `toDatetimeLocal`, `fromDatetimeLocal` se siguen usando igual.
- CSS (`index.css`) — no se necesitan nuevas clases. Las existentes (`glass`, `segmented-*`, `btn`, `input-card`, `eyebrow`) cubren todo.

## Testing

- Los tests existentes de `DashboardPage` y `AdminAerotermiaPage` deben actualizarse para reflejar el nuevo componente DateRangeControls
- Los tests de `ConsumoCard`, `HistoricoCharts`, `FacturasChart` no necesitan cambios
- Si se anade un test para `DateRangeControls`: verificar que los presets funcionan, que el popover abre/cierra, y que el boton muestra el rango correcto

## Convenciones

- Seguir el estilo existente: Tailwind, clases `glass`, `eyebrow`, `segmented-*`, `btn`
- Sin CSS custom — usar las variables CSS y clases de utilidad del proyecto
- TypeScript strict mode
- Commits en espanol con conventional commits
