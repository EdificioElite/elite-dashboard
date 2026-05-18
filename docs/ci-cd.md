# CI/CD y versionado

## Workflows

| Workflow | Archivo | Dispara en |
|---|---|---|
| CI | `.github/workflows/ci.yml` | Push a main/dev, PR a main/dev |
| Docker PR | `.github/workflows/docker-pr.yml` | PR open/sync/reopen |
| Release | `.github/workflows/release.yml` | Manual con selector de version (`workflow_dispatch`) |
| Sync | `.github/workflows/sync.yml` | Push a main (solo merge commits) |

## Flujo de trabajo

El proyecto sigue un modelo Git Flow simplificado:

```
feat/x ──PR──▶ dev ──release manual──▶ main ──sync auto──▶ dev
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

### 3. Promover a main (release)

- Ejecutar manualmente el workflow `Release` (`.github/workflows/release.yml`) seleccionando el tipo de version (`major`, `minor`, `patch`)
- El workflow:
  1. Calcula `vX.Y.Z` desde el ultimo tag
  2. Crea un PR de `dev` → `main` y activa auto-merge
  3. Espera a que el PR se mergee (CI debe pasar: `backend`, `frontend`, `e2e`)
  4. Crea el tag `vX.Y.Z` en main
  5. Crea la GitHub Release
  6. Publica la imagen Docker con tags `:X.Y.Z` y `:latest`

### 4. Sincronizar main → dev

- `sync.yml` crea automaticamente un PR de `main` → `dev` para incorporar version bumps, hotfixes y releases de vuelta a la rama de desarrollo.

### 5. Desplegar en dev (Portainer)

- En cada push a un PR, la imagen `:dev` se actualiza
- Portainer con webhook hace pull + redeploy del stack apuntando a `:dev`

### 6. Desplegar en produccion

- Usar `:latest` o `:X.Y.Z` en el docker-compose
- Cada release actualiza `:latest` automaticamente

## Configuracion del repositorio

- **Ramas `main` y `dev` protegidas**: solo se puede pushear desde PRs, requieren que los checks `backend`, `frontend` y `e2e` pasen
