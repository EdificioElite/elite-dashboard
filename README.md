# Elite Dashboard

Dashboard web para los vecinos de la comunidad Elite. Permite visualizar consumos de aerotermia (kWh electrico y ACS) en tiempo real e historico, facturas mensuales, y gestion de usuarios.

## Arquitectura

```
Vecino -> Frontend React (Vercel) -> Cloudflare Tunnel -> API Express (docker-compose NUC) -> PostgreSQL
```

- **Frontend:** React + Vite + TypeScript + Tailwind + Recharts, desplegado en Vercel
- **Backend:** Express + TypeScript, dockerizado dentro del docker-compose del NUC
- **Auth:** JWT con email/password
- **Datos:** Solo lectura de las tablas `consumos` y `facturas` del PostgreSQL existente (n8n escribe)

## Desarrollo local

### Requisitos

- Node.js 22+
- PostgreSQL con las tablas existentes de n8n (`vecinos`, `contadores`, `consumos`, `facturas`)

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

Anadir al `docker-compose.yml` existente:

```yaml
elite-api:
  build: ./api
  ports:
    - "3001:3001"
  environment:
    - DATABASE_URL=postgres://...
    - JWT_SECRET=...
    - CORS_ORIGIN=https://elite-dashboard.vercel.app
```

### Frontend (Vercel)

Conectar el repo en Vercel:
- Framework: Vite
- Build: `npm run build`
- Output: `dist`
- Env: `VITE_API_URL=https://api.edificioelite.com/api`

### Crear primer usuario admin

```sql
INSERT INTO usuarios (vecino_id, email, password_hash, is_admin)
VALUES (1, 'admin@email.com', '<hash generado con bcrypt>', true);
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
│   └── components/         # ConsumoCard, ConsumoChart, FacturasTable
└── docs/superpowers/       # Specs y planes
```
