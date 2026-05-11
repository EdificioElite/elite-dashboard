# Edificio Élite — Design System

Guía de diseño para el dashboard de la comunidad. Léela completa antes de tocar UI. Cualquier pantalla nueva o refactor debe alinearse con estas reglas.

---

## 1. Filosofía

- **Cálido, no corporativo.** Esto es un panel para vecinos, no un SaaS. Tono cercano, español natural, espacios respirados.
- **Claridad sobre densidad.** Pocos elementos por pantalla, jerarquía clara, una acción primaria visible por contexto.
- **Glass + earth tones.** Tarjetas de cristal esmerilado sobre fondos cálidos animados. Sin gradientes estridentes, sin neón.
- **Movimiento sutil.** Transiciones suaves (250–600 ms, ease-out), animaciones de entrada con desplazamiento y blur. Nunca rebotes ni efectos llamativos.

---

## 2. Marca

- **Nombre:** Edificio Élite
- **Logo:** `public/images/elite/Logotipo PNG.png` (usar siempre el PNG transparente).
- **Imagen del edificio:** `public/images/elite/Encabezado.jpg`.
- **Favicon:** `public/images/favicons/favicon-32x32.png` + `apple-touch-icon.png`.
- **Tipografía del logo:** mayúsculas con tracking amplio. No reproducir manualmente; usar el PNG.

---

## 3. Paleta (extraída del logo)

```css
:root {
  /* Fondos cálidos */
  --bg-base:    #f5ecdc;  /* crema, fondo global */
  --bg-tint-1:  #e7c89a;  /* arena, orb superior */
  --bg-tint-2:  #d4ad7c;  /* camel, orb inferior */
  --bg-tint-3:  #ead7b8;  /* trigo, alternativo */

  /* Tinta */
  --ink:        #3a2f24;            /* cocoa, texto principal */
  --ink-soft:   rgba(58,47,36,.68); /* texto secundario */
  --ink-mute:   rgba(58,47,36,.44); /* texto auxiliar */
  --line:       rgba(58,47,36,.10); /* bordes */
  --line-soft:  rgba(58,47,36,.06);

  /* Acentos */
  --accent:     #b88a5e;  /* camel/bronce — botones primarios */
  --accent-2:   #4d4035;  /* cocoa oscuro — admin, énfasis */
  --accent-soft:#e7c89a;  /* relleno suave */

  /* Cristal */
  --glass-bg:        rgba(255,250,243,.55);
  --glass-bg-strong: rgba(255,250,243,.78);
  --glass-stroke:    rgba(255,255,255,.65);
  --glass-blur:      22px;
  --glass-shadow:
    0 1px 0 rgba(255,255,255,.6) inset,
    0 24px 60px -20px rgba(80,50,30,.22),
    0 8px 18px -10px rgba(80,50,30,.12);

  /* Radios */
  --radius-xl: 28px;
  --radius-lg: 20px;
  --radius-md: 14px;
  --radius-sm: 10px;
}
```

**Color semántico:**
- Calefacción → `--calor` (#c0392b), rojo cálido que representa calefacción.
- Refrigeración → `--frio` (#5b8ba0), azul apagado que representa refrigeración.
- ACS / agua caliente → `--sage` (#6f8a5c) verde salvia, único color que rompe la paleta marrón porque representa "agua").
- Éxito / bajada de consumo → `#5b7a4a`.
- Error / subida de consumo → `#a3402a`.
- No usar el rojo brillante ni el azul por defecto de Tailwind; usar los tonos cálidos definidos aquí.

Extiende Tailwind para tener `bg-cream`, `bg-sand`, `bg-camel`, `text-cocoa`, `border-camel`, `text-accent`, etc.

---

## 4. Tipografía

```html
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

- **Sans (cuerpo, UI):** `Manrope`. `font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif;`
- **Display (titulares grandes, números grandes):** `Fraunces`, peso 500, `letter-spacing: -0.02em`. Reservada para H1, H2 de tarjetas, métricas grandes (`46px+`).
- **Mono (números tabulares, ejes de gráfico, kWh, periodos):** `JetBrains Mono`. Aplicar también `font-variant-numeric: tabular-nums` (`.num`).

**Escala:**
| Uso                           | Family   | Tamaño | Peso | Tracking |
|-------------------------------|----------|--------|------|----------|
| H1 página                     | Fraunces | 40 px  | 500  | -0.02em  |
| H2 tarjeta                    | Fraunces | 24–26 px | 500 | -0.02em |
| Etiqueta sección (uppercase)  | Manrope  | 12 px  | 600  | 0.10em   |
| Cuerpo                        | Manrope  | 14 px  | 400  | 0        |
| Cuerpo secundario             | Manrope  | 13 px  | 400  | 0        |
| Métrica grande                | Fraunces | 46 px  | 500  | -0.02em  |
| Mono valor                    | JetBrains Mono | 12–13 px | 400 | 0   |

Headings de página llevan una **eyebrow label**: 12px Manrope 600, uppercase, tracking 0.12em, color `--ink-mute`. Patrón: eyebrow → H1 → párrafo de soporte.

---

## 5. Fondo y "glass"

**Layout fijo en `App.tsx`**, fuera del `<Routes>`:

```tsx
<div className="bg-stage" aria-hidden>
  <div className="orb o1" /><div className="orb o2" />
  <div className="orb o3" /><div className="orb o4" />
  <div className="grain" />
</div>
<div className="relative z-10">{children}</div>
```

CSS de `bg-stage`, `.orb*`, `@keyframes drift1..4`, y `.grain` se copian tal cual del prototipo. Los orbs son círculos grandes con `filter: blur(60px)` que se desplazan en bucle (26–38s, alternate). Nunca cambiar el blur a menos de 50px ni acelerar la animación.

**Tarjeta de cristal:**
```css
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur)) saturate(150%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(150%);
  border: .5px solid var(--glass-stroke);
  box-shadow: var(--glass-shadow);
  border-radius: var(--radius-lg);
}
.glass-hover { transition: transform .35s cubic-bezier(.2,.7,.2,1), box-shadow .35s; }
.glass-hover:hover { transform: translateY(-2px); /* + sombra reforzada */ }
```

**Reglas:**
- Toda tarjeta principal usa `.glass`. Padding mínimo `24px`, recomendado `26px`.
- No anidar dos `.glass` juntos. Para sub-bloques internos usa `rgba(255,255,255,.5)` plano.
- Bordes siempre `.5px` (no `1px`); el efecto luz con borde grueso se rompe.
- Sombra siempre en `boxShadow` con tonos cocoa (`rgba(80,50,30,...)`), nunca negro puro.

---

## 6. Componentes

### Botones
```css
.btn         { /* glass pill, padding 10×16, radius 999, font 13.5/500 */ }
.btn-primary { background: linear-gradient(180deg, lighter, var(--accent)); color:#fff8ee; }
.btn-ghost   { background: transparent; border: transparent; }
```
- Primario solo uno por vista.
- Hover: `translateY(-1px)` y aclarado del fondo.
- Botones secundarios en cabecera y filas: `.btn-ghost`.
- Iconos a 14px, gap 8px.

### Inputs
- Variante **tarjeta** (admin, formularios): radius 12, fondo `rgba(255,255,255,.55)`, borde `.5px var(--line)`, focus → ring 4px del accent al 14% alpha.
- Variante **minimalista** (login): sin recuadro, sólo `border-bottom .5px var(--line)`, padding `14px 2px`.

### Segmented control
Pill flotante dentro de un track con `border .5px`. La pastilla activa se anima con `transform: translateX()` + width — nunca repintar `background` por botón.

### Chips
- Fondo `rgba(255,255,255,.55)`, borde `.5px var(--line)`, radius 999, padding `4px 10px`, 11.5px/500.
- Variante "admin": fondo `rgba(184,138,94,.12)`, color `var(--accent)`.

### Métricas
- Pequeño icono cuadrado redondeado (28px, fondo del color del dato, icono blanco crema).
- Número en Fraunces 46px + unidad mono 12px en `--ink-mute`.
- Animar el número de su valor previo al nuevo con `requestAnimationFrame` y easing cúbico, 700ms.

### Tablas
```css
table.t th { font-weight:500; color:var(--ink-mute); font-size:11.5px;
             text-transform:uppercase; letter-spacing:.08em; padding:12px 16px; }
table.t td { padding:14px 16px; border-top:.5px solid var(--line-soft); }
table.t tbody tr:hover { background: rgba(255,255,255,.5); }
```
- Sin bordes verticales.
- Filas se entran con `pageIn` escalonado (`animation-delay: i*40ms`).

### Avatar
Círculo 30px con gradiente `var(--accent-soft) → var(--accent)`, iniciales 11.5px/700, color crema.

### Logo
Reusar `<img src="/images/elite/Logotipo PNG.png">` siempre. No recrear con SVG.

---

## 7. Layouts de página

Todas las páginas internas:
```
Header (sticky, glass, margen 16/24)
Main (max-w 1180, padding 0 24, gap 22, flex-col)
  Greeting block (eyebrow + H1 Fraunces + párrafo)
  [contenido]
```

### Login (imagen de fondo + card centrada)
- **Fondo:** `Encabezado.jpg` cubriendo toda la pantalla con doble overlay:
  - `linear-gradient(135deg, rgba(58,47,36,.45), rgba(184,138,94,.25), rgba(245,236,220,.15))`
  - `linear-gradient(180deg, transparent 50%, rgba(245,236,220,.6) 100%)`
- **Card central:** `.glass` centrada, ancho max 380px, padding 32px.
  - Logo PNG 100px, centrado.
  - "Bienvenido" Fraunces 26px, centrado.
  - Inputs con `.input-card`: fondo `rgba(255,255,255,.55)`, borde `.5px var(--line)`, radius 12, padding 12px 14px. Labels asociadas con `htmlFor`.
  - Boton primario pill, uppercase tracking 0.04em, ancho completo.
  - "Sin acceso? Contacta con tu administrador." 11.5px, mute, centrado.
- **Sin frases extra ni subtitulos.** Solo logo, Bienvenido, form, footer.
- Responsivo: la card ocupa max-w-[92vw] en movil.

### Dashboard del vecino
1. Greeting con saludo segun hora (`Buenos dias/tardes/noches`). Sin parrafo de soporte debajo.
2. ConsumoCard (live, calor + frio + ACS + estado) con 4 columnas. Deltas desde inicio de mes.
3. HistoricoCharts: una card con 3 graficas independientes (Calefaccion, Refrigeracion, ACS). Control de tiempo compartido (24h / 7 dias / 30 dias / 1 año + inputs fecha).
4. FacturasChart: barras apiladas con importes calor/frio/ACS por mes. Tooltip con desglose detallado (kWh, m3, importes parciales).
5. FacturasTable.
- **Nunca mostrar datos de otros vecinos.**

### Admin (lista de vecinos)
1. Greeting + botón "Crear acceso".
2. Cuatro Stats glass.
3. Formulario de alta (colapsable, glass).
4. Tabla con buscador integrado en la cabecera (icono lupa + input transparente).

### Admin → vecino
1. Botón ghost "← Volver a vecinos" + greeting con piso/nombre.
2. Cuatro Stats (hoy/semana/mes/última factura).
3. HistoricoCharts con título personalizado.
4. FacturasTable.

---

## 8. Gráficos

No usar Recharts con tema por defecto. Implementar SVG propio o tematizar Recharts con:
- Línea calor: `#c0392b`, 2px, `drop-shadow(0 4px 6px rgba(192,57,43,.18))`.
- Línea frío: `#5b8ba0`, 2px, drop-shadow equivalente.
- Línea ACS: `#4d4035`, 1.5px, dashed, drop-shadow equivalente.
- Áreas: gradiente vertical del color a transparente, alpha `.30` arriba.
- Grid: `rgba(58,47,36,.08)` con `stroke-dasharray: 2 4`.
- Hover: línea guía punteada + dos círculos rellenos crema con borde del color.
- Tooltip: rectángulo `rgba(58,47,36,.92)` con texto crema 11.5px.

---

## 9. Movimiento

```css
@keyframes pageIn {
  from { opacity:0; transform: translateY(8px) scale(.995); filter: blur(4px); }
  to   { opacity:1; transform:none; filter:blur(0); }
}
```
- Cambio de página: `pageIn` 550ms.
- Stagger interno: hijos directos con `animation-delay` 60/120/180/240/300ms.
- Filas de tabla: `i * 40ms`.
- Hover de tarjeta: `translateY(-2px)` + sombra reforzada, 350ms cubic-bezier(.2,.7,.2,1).
- Indicador "En vivo": doble círculo verde salvia con `@keyframes ping` a 2s.
- Barras de comunidad: animar `width` desde 0% con delay por índice.
- **Respeta `prefers-reduced-motion: reduce`** desactivando orbs y `pageIn`.

---

## 10. Copywriting

- Español de España, tuteo.
- Saludos por hora: "Buenos días, María." (incluir el nombre de pila).
- Eyebrows en uppercase: "Hoy", "Histórico", "Comunidad · Hoy", "Panel de administración".
- Confirmaciones cálidas: "Vas bien.", "Tu hogar, en una sola pantalla."
- Errores en una frase, sin signos de exclamación.
- Unidades: kWh siempre en mono. Importes: `64,32 €` (coma decimal, espacio antes del símbolo).
- Periodos: capitalizar mes (`Abril 2026`).

---

## 11. Accesibilidad

- Contraste mínimo AA. `--ink` sobre `--bg-base` ya cumple AAA.
- Focus visible en todos los interactivos: ring de 4px del accent al 14% alpha.
- Labels asociadas (`htmlFor`) en cualquier formulario que no sea el login minimalista.
- `alt` real en `<img>` (logo: "Edificio Élite", imagen edificio: "Fachada del edificio Élite").
- No depender solo del color para estados (usar también iconos ↑/↓, palabras).

---

## 12. Anti-patrones (no hacer)

- ❌ Usar el azul/rojo/verde por defecto de Tailwind.
- ❌ Sombras negras puras.
- ❌ Bordes `1px solid`.
- ❌ Más de un `.glass` anidado.
- ❌ Iconos rellenos pesados; usar siempre stroke 1.5.
- ❌ Emojis en la UI.
- ❌ Animaciones rebote o `ease-in-out` largos.
- ❌ Texto centrado en bloques largos.
- ❌ Recrear el logo con SVG/texto.
- ❌ Páginas sin eyebrow + H1 Fraunces.

---

## 13. Cómo aplicar a una pantalla nueva

1. ¿Pertenece a vecino o admin? Importa `<Header>` correspondiente.
2. Envuelve en `<main>` con el layout estándar (max-w 1180, gap 22).
3. Empieza con eyebrow + H1 Fraunces + párrafo en `--ink-soft`.
4. Decide la acción primaria → `.btn-primary` arriba a la derecha.
5. Cualquier bloque de datos va en una tarjeta `.glass` con su propio eyebrow + H2 Fraunces.
6. Números importantes → Fraunces grande + unidad mono pequeña.
7. Aplica `pageIn` al wrapper y `stagger` a los hijos.
8. Comprueba en móvil (≤820px): el grid se colapsa a una columna.

---

## 14. Dónde mirar

- Prototipo de referencia: `Elite Dashboard.html` + `app.jsx` + `pages.jsx` + `components.jsx`.
- Tokens y reset: bloque `<style>` dentro de `Elite Dashboard.html`.
- Iconos: función `<Icon name="...">` en `components.jsx` (24×24 viewBox, stroke 1.5).
- Datos de ejemplo y formatos: `data.jsx` (`fmtMoney`, `fmtKwh`, `fmtMonth`).

Cuando dudes, copia del prototipo antes de inventar.
