# CI/CD y versionado

## Workflows

| Workflow | Archivo | Dispara en |
|---|---|---|
| CI | `.github/workflows/ci.yml` | Push a main, PR a main |
| Docker PR | `.github/workflows/docker-pr.yml` | PR open/sync/reopen |
| Release | `.github/workflows/release.yml` | Push a main (solo merge commits) |

## Flujo de trabajo

### 1. Crear un PR

- El PR **debe** tener uno de estos labels para pasar el CI y poder mergear:
  - `major` — breaking changes (1.x.x → 2.0.0)
  - `minor` — nuevas features (1.0.x → 1.1.0)
  - `patch` — fixes y cambios pequenos (1.0.0 → 1.0.1)

- En cada commit del PR, `docker-pr.yml` publica la imagen en `ghcr.io/edificioelite/elite-dashboard/api:dev`

### 2. Mergear a main

- Al hacer merge, `release.yml`:
  1. Lee el label del PR para determinar el tipo de bump (major/minor/patch)
  2. Incrementa la version en `api/package.json`
  3. Commitea el bump a main con `[skip ci]`
  4. Crea un tag git `vX.Y.Z`
  5. Crea una release en GitHub
  6. Publica la imagen Docker con tags `:vX.Y.Z` y `:latest`

### 3. Desplegar en dev (Portainer)

- En cada push a un PR, la imagen `:dev` se actualiza
- Configurar Portainer con webhook para hacer pull + redeploy del stack apuntando a `:dev`

### 4. Desplegar en produccion

- Usar `:latest` o `:vX.Y.Z` en el docker-compose
- Cada release actualiza `:latest` automaticamente

## Configuracion del repositorio

- **Rama `main` protegida**: solo se puede pushear desde PRs
- **Bypass**: `github-actions[bot]` puede pushear a main (para el bump de version)
- **Labels requeridos**: `major` (rojo), `minor` (azul), `patch` (verde)
