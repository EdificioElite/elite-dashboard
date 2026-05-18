# Especificación de Diseño: Rediseño del Dashboard

**Fecha:** 2026-05-17
**Rama:** `feat/rediseno-dashboard`
**Enfoque:** Cálido refinado (evolución del estilo actual)

## Resumen

Refinamiento integral del dashboard Edificio Elite manteniendo la identidad cálida actual pero elevando contraste, consistencia, navegación y accesibilidad a nivel WCAG AA. Dirigido a vecinos (consulta de consumo/facturas) y administradores (gestión de vecinos/usuarios, analíticas del edificio).

---

## 1. Sistema de Color

**Decisión:** Paleta B — Contraste alto

| Token | Valor | Uso |
|-------|-------|-----|
| `--bg` | `#FFFBF5` | Fondo principal |
| `--bg-secondary` | `#EDE0CC` | Fondos secundarios, filas zebra |
| `--ink` | `#1E140A` | Texto principal |
| `--ink-soft` | `#4A3D32` | Texto muted (≥4.5:1 sobre bg) |
| `--accent` | `#A6754B` | Links, botones primary, iconos activos |
| `--accent-dark` | `#8C5E3A` | Hover de botones primary |
| `--calor` | `#B53228` | Calefacción (rojo saturado) |
| `--frio` | `#4A7A8C` | Refrigeración (teal oscuro) |
| `--acs` | `#5D7A4A` | ACS (verde sage) |
| `--fijo` | `#8B6B4A` | Costes fijos (marrón medio) |
| `--rise` | `#8A2A1E` | Peligro/borrar |

**Regla:** Todo texto sobre fondo cumple ≥4.5:1 (AA normal). Textos grandes (≥24px) cumplen ≥3:1.

---

## 2. Tipografía

Se mantienen las 3 familias, refinando escala:

| Rol | Familia | Tamaño | Peso |
|-----|---------|--------|------|
| Page title | Fraunces | 38px | 500 |
| Section heading | Manrope | 14px | 700 |
| KPI value | Fraunces | 28px | 400 |
| KPI unit | JetBrains Mono | 11px | 500 |
| Body text | Manrope | 14px | 400 |
| Table cell | Manrope | 13px | 400 |
| Chart labels | Manrope | 11px | 500 |

---

## 3. Layout y Navegación

### Header
- Alto: 52px (antes 72px)
- Logo a la izquierda
- Vecinos: navegación horizontal centrada (Inicio, Aerotermia, Juntas, Contactos)
- Avatar de usuario a la derecha con dropdown (email, cambiar contraseña, logout)
- Móvil: drawer lateral izquierdo con slide-in, no overlay fullscreen

### Sidebar Admin (nuevo)
- Solo visible para `is_admin`
- Ancho: 220px, fija a la izquierda
- Secciones: Admin (Vecinos, Usuarios, Aerotermia) + Edificio (Inicio, Aerotermia, Juntas, Contactos)
- Ítem activo con indicador lateral + fondo sutil
- Animación de colapso suave en móvil

### Breadcrumb
- AdminConsumoPage: Admin → Vecinos → Piso 3A
- Resto de páginas admin: Admin → Sección actual

### Mejoras de navegación
- `Cmd+K` / `Ctrl+K`: búsqueda rápida de páginas (opcional, nice-to-have)
- Indicador visual de sección activa en nav

---

## 4. Sistema de Componentes

### Tarjetas (Cards)
- **Estilo:** Glass ligero — `backdrop-filter: blur(12px)`, fondo `rgba(255,251,245, 0.85)`, borde `1px solid rgba(30,20,10, 0.06)`, sombra sutil
- **Hover:** escala 1.02 + elevación de sombra, 200ms ease-out
- **KPI cards:** valor grande Fraunces, unidad JetBrains Mono, sparkline de 7 días

### Tablas
- Header sticky al hacer scroll
- Filas zebra sutiles (alternancia `--bg-secondary` cada 2 filas)
- Columnas ordenables con indicador visual ↕
- Densidad responsive: compacta en móvil, cómoda en desktop
- Estados de celda: positivo (verde sutil), negativo (rojo sutil), neutro
- Hover de fila: elevación ligera + cambio sutil de fondo

### Botones
- **Primary:** gradiente `--accent` → `--accent-dark`, texto blanco, sombra sutil, border-radius 10px
- **Secondary:** borde 1.5px `rgba(30,20,10, 0.15)`, fondo transparente
- **Ghost:** sin borde ni fondo, solo texto
- **Danger:** borde `--rise` al 20%, texto `--rise`
- **Pill/Chip:** border-radius 999px, para estados (online, admin)
- Tamaño mínimo táctil: 44x44px

### Inputs
- Label superior claro (no placeholder como label)
- Error: icono + mensaje debajo del campo, borde rojo
- Selects estilizados consistentes
- Toggle switches para booleanos (rol admin, enviar email)

### Modales
- Animación: scale(0.95)→scale(1) + opacity, 200ms
- Backdrop: blur(4px) + rgba(0,0,0,0.3)
- Cerrar: Escape, click fuera, botón X
- Foco atrapado dentro del modal
- Confirmaciones de borrado: danger a la izquierda, cancelar a la derecha

---

## 5. Gráficas y Visualización de Datos

### Cambios globales
- **Tooltips:** fondo `#FFFBF5`, borde sutil, sombra, texto `#1E140A`
- **Grid lines:** opacidad 12% (antes 6%) para mejor legibilidad en móvil
- **Ejes:** labels 12px en móvil, formateo con unidades
- **Leyenda:** interactiva — click para ocultar/mostrar serie, hover resalta
- **aria-label:** cada gráfica con resumen textual

### Colores de charts (más saturados)
- Calor: `#B53228`, Frío: `#4A7A8C`, ACS: `#5D7A4A`, Fijo: `#A6754B`, Eléctrica: `#8B6B4A`

### HistoricoCharts (líneas)
- Líneas 3px (antes 2.5px)
- Área bajo línea: gradiente sutil al 12% (antes 8%)
- Dots de hover más grandes, animación de escala
- Selector de rango: mantener SegmentedControl + añadir input date-range nativo como alternativa

### PieChart (donut)
- InnerRadius 70% (antes 60%)
- Valor total en el centro del donut
- Labels externas con porcentaje + nombre

### Heatmap
- Escala perceptualmente uniforme (cálida, tipo Viridis)
- Celdas con border-radius y gap entre ellas
- Tooltip en cada celda con valor exacto
- Leyenda de escala abajo

### Nuevo: Sparklines
- Mini gráfica de 7 días en cada KPI card (InicioPage y AdminAerotermiaPage)
- Sin ejes, solo línea de tendencia con gradiente sutil

---

## 6. Motion y Animación

- **Duración:** 150-300ms, nunca >400ms
- **Entrada de página:** fadeUp + blur + slide horizontal sutil desde dirección de navegación
- **Stagger:** mantener 60ms por hijo
- **Sidebar admin:** collapse/expand con deslizamiento + opacity
- **Menú móvil:** slide from left + backdrop fade, 250ms
- **KPI cards:** count-up animation al entrar en viewport (números animados)
- **Dropdown usuario:** scale(0.9)→scale(1) + opacity, 180ms
- **Live dot:** pulso actual + tooltip "Conectado"
- **Respetar:** `prefers-reduced-motion` desactiva todas las animaciones

---

## 7. Accesibilidad (WCAG AA)

- **Contraste:** todo texto ≥4.5:1, textos grandes ≥3:1
- **Foco visible:** anillo 3px en todos los interactivos
- **Skip to content:** link oculto, visible al primer Tab
- **Teclado:** todos los interactivos navegables con Tab, modal atrapa foco
- **aria-labels:** en iconos, gráficas, botones sin texto, enlaces
- **Roles semánticos:** main, nav, banner, complementary, dialog
- **prefers-reduced-motion:** respetado
- **Zoom:** no bloquear en móvil
- **Tamaños táctiles:** mínimo 44x44px

---

## 8. Cambios por Página

### Vecinos

| Página | Cambios |
|--------|---------|
| `/inicio` | Greeting compacto, KPI count-up, sparklines, tarjeta última factura, diseño unificado info cards |
| `/aerotermia` | Layout 2-columnas, tooltips claros, HA card colapsable |
| `/juntas` | Tablas refinadas, badges de estado |
| `/contactos` | Avatar circular, botones 44px, datos alineados |

### Admin

| Página | Cambios |
|--------|---------|
| `/admin/vecinos` | Stats sparklines, tabla ordenable, form inline colapsable, tooltips en acciones |
| `/admin/usuarios` | Tabla refinada, toggle switch admin, indicador online mejorado |
| `/admin/aerotermia` | Layout reorganizado en grid, secciones colapsables, heatmap mejorado |
| `/admin/vecino/:piso` | Breadcrumb, KPI cards, tablas/charts refinados |

### Auth

| Página | Cambios |
|--------|---------|
| Login / Registro / Recuperar | Centrado real, logo más grande, glass ligero, errores con icono, autofocus |

---

## 9. Plan de Implementación (orden)

1. **Tokens y base CSS** — Actualizar `:root` en `index.css` y `tailwind.config.js` con nueva paleta, tipografía, glass ligero
2. **Header + Sidebar admin** — Refactorizar Header.tsx, crear Sidebar.tsx, actualizar App.tsx layout
3. **Componentes base** — Botones, inputs, modales con nuevos estilos y accesibilidad
4. **Tablas** — Refinar FacturasTable, tablas CRUD de admin
5. **Tarjetas KPI** — Refinar ConsumoCard, añadir sparklines
6. **Gráficas** — Actualizar tooltips, colores, grosores en todos los charts
7. **Páginas vecinos** — InicioPage, DashboardPage, JuntasGeneralesPage, ContactosPage
8. **Páginas admin** — VecinosPage, UsuariosPage, AdminAerotermiaPage, AdminConsumoPage
9. **Páginas auth** — LoginPage, RegistroPage, ForgotPasswordPage, ResetPasswordPage
10. **Accesibilidad** — Skip link, foco visible, aria-labels, roles semánticos
11. **Pruebas** — Verificar tests existentes, build, typecheck

---

## 10. Lo que NO cambia

- Funcionalidad de negocio (APIs, lógica de auth, Zustand store)
- Datos y endpoints del backend
- Recharts como librería de charts
- Tailwind como framework CSS
- Fraunces y JetBrains Mono como fuentes
- Estructura de rutas
