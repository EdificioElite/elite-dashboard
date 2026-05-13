# Vercel Analytics + Speed Insights

## Objetivo

Añadir monitorización de tráfico y rendimiento al frontend desplegado en Vercel.

## Paquetes

- `@vercel/analytics` — page views y visitantes en el dashboard de Vercel
- `@vercel/speed-insights` — Core Web Vitals (LCP, FCP, CLS, INP, TTFB)

## Cambios

### `src/main.tsx`

Importar y renderizar ambos componentes junto a `<App />` dentro de `StrictMode`:

```tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

// Dentro de <StrictMode>:
<Analytics />
<SpeedInsights />
```

### Sin cambios en:
- `vercel.json`
- `vite.config.ts`
- `.env` / `.env.example`
- `package.json` scripts o build

### Comportamiento

- En producción: envían datos automáticamente al proyecto de Vercel asociado
- En desarrollo (localhost): no envían datos
- Sin configuración adicional requerida
