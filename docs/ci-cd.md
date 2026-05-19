# CI/CD y versionado

## Workflows

| Workflow | Archivo | Dispara en |
|---|---|---|
| CI | `.github/workflows/ci.yml` | Push a main, PR a main |
| Docker PR | `.github/workflows/docker-pr.yml` | PR open/sync/reopen |
| Release | `.github/workflows/release.yml` | Manual con selector de version (`workflow_dispatch`) |

## Flujo de trabajo

El proyecto sigue un modelo de rama unica:

```
feat/x ──PR──▶ main ──release manual──▶ tag + GitHub Release + Docker
```

| Rama | Entorno | URL | Backend |
|---|---|---|---|
| `main` | Production | www.edificioelite.com | api.edificioelite.com |
| PR | Preview/Dev | dev.edificioelite.com | api-dev.edificioelite.com |

### 1. Crear un PR a main

- Ramas `feat/`, `fix/`, `docs/`, `chore/` parten de `main`
- Se crea PR hacia `main`
- En cada commit del PR, `docker-pr.yml` publica la imagen en `ghcr.io/edificioelite/elite-dashboard/api:dev`

### 2. Mergear a main

- Al mergear a `main`, Vercel despliega automaticamente en `www.edificioelite.com`
- La imagen Docker `:dev` se actualiza y Portainer hace pull + redeploy del backend en el entorno de preview

### 3. Publicar release

- Ejecutar manualmente el workflow `Release` (`.github/workflows/release.yml`) seleccionando el tipo de version (`major`, `minor`, `patch`)
- El workflow:
  1. Calcula `vX.Y.Z` desde el ultimo tag
  2. Crea y pushea el tag `vX.Y.Z` en main
  3. Crea la GitHub Release con notas generadas automaticamente
  4. Publica la imagen Docker con tags `:X.Y.Z` y `:latest`

### 4. Desplegar en produccion

- Usar `:latest` o `:X.Y.Z` en el docker-compose
- Cada release actualiza `:latest` automaticamente

## Configuracion del repositorio

- **Rama `main` protegida**: solo se puede pushear desde PRs, requiere que los checks `backend`, `frontend` y `e2e` pasen
