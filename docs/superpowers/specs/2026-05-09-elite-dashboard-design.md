# Elite Dashboard - Spec

## Resumen

Dashboard web para los vecinos de la comunidad Elite. Permite login con email/password, visualizar consumos historicos de aerotermia (kWh electrico y ACS), lectura actual y facturas mensuales. Incluye panel de administracion para gestionar usuarios.

## Arquitectura

```
[Vecino] → [Frontend React+Vite en Vercel] → [Cloudflare Tunnel] → [API Node.js/TS en docker-compose] → [PostgreSQL]
                                                                   ↑
                                                              [n8n ya existente]
```

- **Frontend** (`elite-dashboard`): React + Vite + TypeScript + Recharts, deploy en Vercel
- **Backend** (mismo repo, carpeta `api/`): Express + TypeScript, dockerizado, se anade al docker-compose existente del NUC
- **Auth**: JWT (email + password → token almacenado en localStorage)
- **Admin**: misma app, vistas protegidas por rol `is_admin`

## Base de datos

### Tabla nueva: `usuarios`

```sql
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  vecino_id INTEGER REFERENCES vecinos(id) UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

Las tablas existentes (`vecinos`, `contadores`, `consumos`, `facturas`, `facturaelectrica`, `emailsprocesadosn8n`) **no se modifican**. La API solo lee `consumos` y `facturas`, nunca escribe (la escritura la sigue haciendo n8n).

### Relacion vecino-consumos

La API resuelve: `usuarios.vecino_id → vecinos.id → contadores.vecino_id → consumos.contador_id`

## Backend API

Endpoints REST con Express + TypeScript, driver `pg` (sin ORM). Contrasenas con bcrypt, JWT con expiracion configurable.

### Endpoints publicos

| Metodo | Ruta               | Body/Params                 | Respuesta          | Auth |
|--------|--------------------|-----------------------------|---------------------|------|
| POST   | /api/auth/login    | { email, password }         | { token, user }     | No   |
| GET    | /api/health        | -                           | { status: "ok" }    | No   |

### Endpoints vecino (requieren JWT)

| Metodo | Ruta                  | Query params             | Respuesta                       |
|--------|-----------------------|--------------------------|----------------------------------|
| GET    | /api/auth/me          | -                        | { email, vecino_id, is_admin }  |
| GET    | /api/consumos         | ?desde=&hasta=           | [ { timestamp, kwh_electrico, kwh_acs } ] |
| GET    | /api/consumo-actual   | -                        | { timestamp, kwh_electrico, kwh_acs } |
| GET    | /api/facturas         | ?anio=                   | [ { periodo, importe, kwh_electrico, kwh_acs } ] |

### Endpoints admin (requieren JWT + is_admin=true)

| Metodo | Ruta                    | Body                           | Respuesta              |
|--------|-------------------------|--------------------------------|-------------------------|
| GET    | /api/admin/vecinos      | -                              | [ vecinos + usuarios ] |
| GET    | /api/admin/vecinos/:id  | -                              | consumos del vecino    |
| POST   | /api/admin/usuarios     | { email, password, vecino_id } | { usuario creado }     |

### Middleware

- `authMiddleware`: verifica JWT en `Authorization: Bearer <token>`, inyecta `req.user`
- `adminMiddleware`: verifica `req.user.is_admin === true`, devuelve 403 si no

### Seguridad

- bcrypt (salt rounds 12) para passwords
- JWT con expiracion (ej. 7 dias)
- Rate limiting basico en `/api/auth/login` (3 intentos/minuto)
- CORS configurado solo para el dominio de Vercel
- Todas las queries parametrizadas contra SQL injection

## Frontend

### Paginas

| Ruta              | Componente      | Descripcion                                          |
|-------------------|------------------|------------------------------------------------------|
| /login            | LoginPage        | Email + password, redirige a /dashboard o /admin     |
| /dashboard        | DashboardPage    | Consumo actual, grafico historico, listado facturas  |
| /admin            | AdminPage        | Listado vecinos, vista consumos, crear usuarios      |
| /admin/vecino/:id | AdminVecinoPage  | Vista detallada de consumo de un vecino              |

### Componentes clave

- **ConsumoCard**: tarjeta con la lectura actual (kWh elec + ACS + timestamp)
- **ConsumoChart**: grafico de lineas Recharts con selector de rango (dia/semana/mes)
- **FacturasTable**: tabla de facturas mensuales filtrable por ano
- **AuthProvider**: contexto que maneja login/logout/token/redireccion

### Stack

- React 19 + Vite + TypeScript
- React Router v6
- Recharts (graficos)
- Zustand (estado global ligero para auth)
- CSS Modules o Tailwind CSS

### Flujo de auth

1. App carga → AuthProvider verifica si hay token en localStorage
2. Si hay token → llama GET /api/auth/me para validar → Dashboard o Admin
3. Si no hay token o expiro → redirige a Login
4. Login OK → guarda token en localStorage → redirige segun is_admin

## Deployment

### Frontend (Vercel)

- Conectado al repo de GitHub
- Variable de entorno `VITE_API_URL` apuntando al Cloudflare Tunnel (ej. `https://api.elite.example.com`)

### Backend (Docker)

- Carpeta `api/` en el mismo repo
- Dockerfile multi-stage (build TypeScript → produccion Node.js)
- Se anade al `docker-compose.yml` existente del NUC como servicio `elite-api`
- Expuesto en puerto interno, Cloudflare Tunnel apunta a el
- Variables de entorno: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`

## No scope (explictamente fuera)

- Registro publico de vecinos
- Recuperacion de password (MVP sin email server)
- Subida/descarga de PDFs de facturas
- Notificaciones
- WebSockets/tiempo real (se usa polling desde el frontend o datos ya cacheados)
- Modificacion de datos desde el dashboard (solo lectura, n8n escribe)
