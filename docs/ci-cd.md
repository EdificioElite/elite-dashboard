# CI/CD y versionado

## Workflows

| Workflow | Archivo | Dispara en |
|---|---|---|
| CI | `.github/workflows/ci.yml` | Push a main/dev, PR a main/dev |
| Docker PR | `.github/workflows/docker-pr.yml` | PR open/sync/reopen |
| Release | `.github/workflows/release.yml` | Push a main (solo merge commits) |
| Promote | `.github/workflows/promote.yml` | Manual (`workflow_dispatch`) |
| Sync | `.github/workflows/sync.yml` | Push a main (solo merge commits) |

## Flujo de trabajo

El proyecto sigue un modelo Git Flow simplificado:

```
feat/x ──PR──▶ dev ──promote manual──▶ main ──sync auto──▶ dev
```

| Rama | Entorno | URL | Backend |
|---|---|---|---|
| `dev` | Preview/Dev | dev.edificioelite.com | api-dev.edificioelite.com |
| `main` | Production | www.edificioelite.com | api.edificioelite.com |

### 1. Crear un PR a dev

- Ramas `feat/`, `fix/`, `docs/`, `chore/` parten de `dev`
- Se crea PR hacia `dev`
- En cada commit del PR, `docker-pr.yml` publica la imagen en `ghcr.io/edificioelite/elite-dashboard/api:dev`

### 2. Mergear a dev

- Al mergear a `dev`, Vercel despliega automaticamente en `dev.edificioelite.com`
- La imagen Docker `:dev` se actualiza y Portainer hace pull + redeploy del backend

### 3. Promover a main

- Ejecutar manualmente el workflow `Promote dev to main` (`.github/workflows/promote.yml`)
- Esto crea un PR de `dev` → `main`
- **Ese PR debe tener** uno de estos labels para pasar el CI y poder mergear:
  - `major` — breaking changes (1.x.x → 2.0.0)
  - `minor` — nuevas features (1.0.x → 1.1.0)
  - `patch` — fixes y cambios pequenos (1.0.0 → 1.0.1)

### 4. Mergear a main (release)

- Al hacer merge del PR de promocion, `release.yml`:
  1. Lee el label del PR para determinar el tipo de bump (major/minor/patch)
  2. Incrementa la version en `api/package.json`
  3. Crea un tag git `vX.Y.Z` sobre el merge commit
  4. Crea una release en GitHub
  5. Publica la imagen Docker con tags `:vX.Y.Z` y `:latest`

### 5. Sincronizar main → dev

- `sync.yml` crea automaticamente un PR de `main` → `dev` para incorporar version bumps, hotfixes y releases de vuelta a la rama de desarrollo.

### 6. Desplegar en dev (Portainer)

- En cada push a un PR, la imagen `:dev` se actualiza
- Portainer con webhook hace pull + redeploy del stack apuntando a `:dev`

### 7. Desplegar en produccion

- Usar `:latest` o `:vX.Y.Z` en el docker-compose
- Cada release actualiza `:latest` automaticamente

## Configuracion del repositorio

- **Ramas `main` y `dev` protegidas**: solo se puede pushear desde PRs, requieren que los checks `backend`, `frontend`, `e2e` y `check-labels` pasen
- **Labels requeridos**: solo en PRs de `dev` → `main` (los de promocion): `major` (rojo), `minor` (azul), `patch` (verde)
