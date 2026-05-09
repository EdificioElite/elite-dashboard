# AGENTS.md

Instrucciones para agentes de IA que trabajen en este proyecto.

## Comandos

### Frontend

```bash
npm install          # Instalar dependencias (raiz del proyecto)
npm run dev          # Servidor de desarrollo Vite (:5173)
npm run build        # Compilar TypeScript + build Vite
npm run preview      # Previsualizar build de produccion
```

### Backend

```bash
cd api && npm install   # Instalar dependencias
cd api && npm run dev   # Servidor de desarrollo con tsx (:3001)
cd api && npm run build # Compilar TypeScript a dist/
cd api && npm run migrate # Ejecutar migraciones SQL
```

### Verificacion

```bash
npm run build                  # Verificar frontend compila
cd api && npx tsc --noEmit     # Verificar backend compila
```

## Convenciones

- TypeScript strict mode en todo el proyecto
- Backend: CommonJS (`module: commonjs`), target ES2022
- Frontend: ESNext con bundler, JSX react-jsx
- Commits en espanol con conventional commits (`feat:`, `fix:`, `docs:`)
- No modificar tablas existentes de n8n (`vecinos`, `contadores`, `consumos`, `facturas`, `facturaelectrica`)
- Solo lectura desde el dashboard, n8n es el unico que escribe datos de consumo/facturas
- Variables de entorno: nunca commitear `.env`, usar `.env.example` como plantilla
- Estilos con Tailwind CSS, no CSS custom
- Tailwind config: `content` incluye `./index.html` y `./src/**/*.{js,ts,jsx,tsx}`

## Testing

No hay test suite configurada actualmente. Si se anade:
- Backend: vitest + supertest
- Frontend: vitest + @testing-library/react
