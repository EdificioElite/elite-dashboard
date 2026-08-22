# Elite Dashboard

Dashboard web para los vecinos de la comunidad Elite. Permite visualizar consumos termicos de aerotermia (kWh calor, kWh frio) y ACS en tiempo real e historico, facturas mensuales, y gestion de usuarios.

## Arquitectura

```
Vecino -> Frontend React (Vercel) -> Cloudflare Tunnel -> API Express (docker-compose NUC) -> PostgreSQL
```

- **Frontend:** React + Vite + TypeScript + Tailwind + Recharts, desplegado en Vercel
- **Backend:** Express + TypeScript, dockerizado dentro del docker-compose del NUC
- **Auth:** JWT access token (1h) + refresh token (30d, sesión deslizante)
- **Datos:** Solo lectura de las tablas `consumos` y `facturas` del PostgreSQL existente (n8n escribe)

## Desarrollo local

### Requisitos

- Node.js 22+
- PostgreSQL con las tablas existentes de n8n (`vecinos`, `contadores`, `consumos`, `facturas`)
- Alternativa: usar `docker compose -f docker-compose.e2e.yml up -d` para un entorno completo (postgres + api + frontend)

### Backend

```bash
cd api
cp .env.example .env  # editar con tus credenciales
npm install
npm run migrate        # crear tabla usuarios
npm run dev            # arranca en :3001
```

### Frontend

```bash
cp .env.example .env   # VITE_API_URL=http://localhost:3001/api
npm install
npm run dev            # arranca en :5173
```

## Despliegue

### Backend (NUC)

El backend se despliega como stack de Portainer desde el repo [`EdificioElite/portainer-compose`](https://github.com/EdificioElite/portainer-compose) (directorio `dashboards/`), usando la imagen `ghcr.io/edificioelite/elite-dashboard/api`.

Las migraciones se ejecutan automáticamente con un init-container (`dashboard-api-migrate` / `dashboard-api-dev-migrate`) que corre `node dist/migrate.js` con los roles `migrator` (prod) y `migrator_dev` (dev) antes de arrancar la API. Ver [CONTRIBUTING.md](./CONTRIBUTING.md#migraciones) para el proceso completo (roles de migración, baseline y release).

### Frontend (Vercel)

Conectar el repo en Vercel:
- Framework: Vite
- Build: `npm run build`
- Output: `dist`
- Env: `VITE_API_URL=https://api.edificioelite.com/api`

### Crear primer usuario admin

```sql
INSERT INTO usuarios (email, password_hash, vecino_piso, role)
VALUES ('admin@email.com', '<hash generado con bcrypt>', '1A', 'admin');
```

## Estructura

```
.
├── api/                    # Backend Express + TypeScript
│   ├── src/
│   │   ├── index.ts        # Entry point
│   │   ├── config.ts       # Variables de entorno
│   │   ├── db.ts           # Pool PostgreSQL
│   │   ├── migrate.ts      # Ejecutar migraciones
│   │   ├── lib/jwt.ts      # JWT helpers
│   │   ├── middleware/      # auth, admin, rateLimit
│   │   └── routes/          # auth, consumos, facturas, admin
│   └── migrations/          # SQL migrations
├── src/                    # Frontend React
│   ├── api/client.ts       # Fetch wrapper con auth
│   ├── store/auth.ts       # Zustand auth store
│   ├── pages/              # LoginPage, DashboardPage, AdminPage, AdminVecinoPage
│   └── components/         # Header, ConsumoCard, HistoricoCharts, FacturasChart, FacturasTable, SegmentedControl
├── e2e/                    # Tests end-to-end con Playwright
└── docs/superpowers/       # Specs y planes
```
