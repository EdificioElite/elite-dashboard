# Release Workflow Refactor

**Fecha:** 2026-05-15
**Estado:** Diseño aprobado

## Problema

El flujo actual de release tiene tres fricciones:

1. **Dos workflows + intervención manual**: `promote.yml` crea un PR `dev→main`, un humano asigna label `major`/`minor`/`patch`, mergea el PR, y `release.yml` reacciona al push.
2. **Labels como mecanismo de versionado**: frágil, propenso a olvidos (el `check-labels` estaba skipeando en PR #30).
3. **package.json desincronizados**: `package.json` (raíz) está en `1.0.0` y `api/package.json` en `0.0.0`, sin actualizarse en los releases.

## Objetivo

Un solo `workflow_dispatch` donde el usuario elige `major`/`minor`/`patch` y todo el flujo se ejecuta sin más intervención: bump de versión en ficheros, promoción `dev→main`, tag, GitHub release y Docker build.

## Restricciones

- `main` tiene branch protection: requiere PR, checks `backend`/`frontend`/`e2e`, `enforce_admins: true`. No se puede hacer push directo.
- `dev` tiene branch protection similar. Posiblemente no permite push directo tampoco.
- No se genera CHANGELOG.
- `sync.yml` (main→dev) se mantiene sin cambios.
- El workflow de release debe ser `workflow_dispatch` con input `choice` (`major`/`minor`/`patch`).

## Diseño

### Archivos

| Archivo | Acción |
|---|---|
| `.github/workflows/release.yml` | **Nuevo** — `workflow_dispatch`, reemplaza a `promote.yml` |
| `.github/workflows/publish.yml` | **Renombrado** desde `release.yml` actual, simplificado |
| `.github/workflows/promote.yml` | **Eliminado** |
| `.github/workflows/ci.yml` | Eliminar job `check-labels` |
| Protección rama `main` | Quitar `check-labels` de checks requeridos |
| Protección rama `dev` | Quitar `check-labels` de checks requeridos |

### `release.yml` (nuevo)

Workflow disparado manualmente desde GitHub Actions UI con un selector de tipo de versión.

```yaml
name: Release

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Tipo de version'
        required: true
        type: choice
        options:
          - patch
          - minor
          - major

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          ref: dev
          fetch-depth: 0

      - name: Compute next version
        id: version
        run: |
          LAST_TAG=$(git tag --sort=-v:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -1)
          if [ -z "${LAST_TAG}" ]; then
            LAST_TAG="v0.0.0"
          fi
          echo "Last tag: ${LAST_TAG}"

          MAJOR=$(echo "${LAST_TAG}" | sed 's/v//' | cut -d. -f1)
          MINOR=$(echo "${LAST_TAG}" | sed 's/v//' | cut -d. -f2)
          PATCH=$(echo "${LAST_TAG}" | sed 's/v//' | cut -d. -f3)

          case "${{ inputs.version }}" in
            major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
            minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
            patch) PATCH=$((PATCH + 1)) ;;
          esac

          NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"
          echo "New version: ${NEW_VERSION}"
          echo "version=${NEW_VERSION}" >> $GITHUB_OUTPUT

      - name: Bump version in package.json files
        run: |
          jq --arg v "${{ steps.version.outputs.version }}" '.version = $v' package.json > tmp.json && mv tmp.json package.json
          jq --arg v "${{ steps.version.outputs.version }}" '.version = $v' api/package.json > tmp.json && mv tmp.json api/package.json

      - name: Commit and push to dev
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add package.json api/package.json
          git commit -m "chore: bump version to v${{ steps.version.outputs.version }}"
          git push origin dev

      - name: Create release PR and auto-merge
        run: |
          PR_URL=$(gh pr create \
            --title "Release v${{ steps.version.outputs.version }}" \
            --body "PR automatizada de release v${{ steps.version.outputs.version }}. Tipo: \`${{ inputs.version }}\`." \
            --head dev \
            --base main)

          PR_NUMBER=$(echo "${PR_URL}" | grep -oP '\d+$')
          echo "PR creada: ${PR_URL}"

          gh pr merge "${PR_NUMBER}" --auto --merge
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Pasos:**
1. Checkout de `dev` con historial completo
2. Calcula `vX.Y.Z` desde el último tag + input del usuario
3. Actualiza `version` en `package.json` (raíz) y `api/package.json`
4. Commit `chore: bump version to vX.Y.Z` y push a `dev`
5. Crea PR `dev→main` con título `Release vX.Y.Z`
6. Activa auto-merge (`--auto --merge`): GitHub mergea automáticamente cuando los checks requeridos (`backend`, `frontend`, `e2e`) pasen

### `publish.yml` (renombrado desde `release.yml`)

Se dispara al pushear a `main` (tras el merge del PR de release). Ya no lee labels del PR; lee la versión directamente de `package.json`.

```yaml
name: Publish

on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}/api

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      packages: write
    if: startsWith(github.event.head_commit.message, 'Merge pull request')

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Read version from package.json
        id: version
        run: |
          VERSION=$(jq -r '.version' package.json)
          echo "Version: ${VERSION}"
          echo "version=${VERSION}" >> $GITHUB_OUTPUT

      - name: Create GitHub Release
        run: |
          gh release create "v${{ steps.version.outputs.version }}" \
            --title "v${{ steps.version.outputs.version }}" \
            --generate-notes \
            --target main
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Set lowercase image name
        run: |
          echo "IMAGE_NAME_LC=$(echo "${IMAGE_NAME}" | tr '[:upper:]' '[:lower:]')" >> $GITHUB_ENV

      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME_LC }}
          tags: |
            type=raw,value=${{ steps.version.outputs.version }}
            type=raw,value=latest

      - uses: docker/setup-buildx-action@v3

      - uses: docker/build-push-action@v6
        with:
          context: api
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Create tag and push
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git tag "v${{ steps.version.outputs.version }}"
          git push origin "v${{ steps.version.outputs.version }}"
```

**Cambios respecto al `release.yml` actual:**
- Eliminados los steps `Extract PR number` y `Get PR labels and determine bump`
- Eliminado `Compute next version from tags` (ya no calcula el bump, solo lee de `package.json`)
- Añadido step `Read version from package.json` que usa `jq` para leer la versión

### `ci.yml` — eliminar `check-labels`

Se elimina el job `check-labels` (líneas 11-28). También se elimina `labeled`/`unlabeled` de los triggers del evento `pull_request` (línea 7), ya que sin `check-labels` no hay jobs que reaccionen a cambios de labels.

Trigger resultante:
```yaml
on:
  push:
    branches: [main, dev]
  pull_request:
    types: [opened, synchronize, reopened]
    branches: [main, dev]
```

### Branch protection

En la configuración de GitHub (Settings > Branches), quitar `check-labels` de los checks requeridos en `main` y `dev`.

### `sync.yml`

Sin cambios. Sigue creando PR `main→dev` con auto-merge tras cada push a `main`.

### Riesgo: push directo a `dev`

`dev` tiene branch protection. Si bloquea el push directo, el commit de bump de versión fallará en el step "Commit and push to dev". En ese caso, el plan B es:

1. Crear branch `release/vX.Y.Z` desde `dev`
2. Commit del bump en esa branch
3. PR `release/vX.Y.Z` → `dev` con auto-merge
4. PR `dev` → `main` con auto-merge

Esto añade un PR extra pero cumple con las protecciones. Se evaluará durante la implementación si es necesario.

## Flujo completo

```
Usuario dispara "Release" desde Actions UI
  ├── Elige: patch | minor | major
  │
  ▼
release.yml
  ├── Calcula vX.Y.Z desde último tag
  ├── Bump version en package.json + api/package.json
  ├── Commit + push a dev
  ├── Crea PR dev→main
  └── Activa auto-merge
        │
        ▼ (CI pasa: backend, frontend, e2e)
  GitHub auto-mergea el PR a main
        │
        ▼
publish.yml (on push to main)
  ├── Lee version de package.json
  ├── Crea GitHub Release
  ├── Build + push Docker image
  └── Crea + push tag vX.Y.Z
        │
        ▼
sync.yml (on push to main)
  └── Crea PR main→dev con auto-merge
```
