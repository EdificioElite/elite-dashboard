# Release Workflow Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el flujo de release basado en labels por un `workflow_dispatch` unificado con selector de version (`major`/`minor`/`patch`) que bump version en package.json, promueve `dev→main` via auto-merge, y publica tag/release/Docker.

**Architecture:** Un workflow `release.yml` (`workflow_dispatch`) disparado por el usuario hace el bump y crea el PR con auto-merge. Al mergear a `main`, `publish.yml` (renombrado desde el actual `release.yml`) lee la version de `package.json` y crea tag + release + Docker. `sync.yml` (sin cambios) sincroniza `main→dev`.

**Tech Stack:** GitHub Actions, `gh` CLI, `jq`, Docker build-push-action

---

### Task 1: Crear nuevo `release.yml`

**Files:**
- Create: `.github/workflows/release.yml`
- Delete (after rename in Task 2): `.github/workflows/release.yml` (actual)

- [ ] **Step 1: Guardar el `release.yml` actual como `publish.yml`**

```bash
git mv .github/workflows/release.yml .github/workflows/publish.yml
```

- [ ] **Step 2: Crear `.github/workflows/release.yml` (nuevo, workflow_dispatch)**

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

      - name: Check if dev is ahead of main
        id: check
        run: |
          git fetch origin dev main
          DIFF=$(git rev-list origin/main..origin/dev --count)
          echo "commits_ahead=${DIFF}" >> $GITHUB_OUTPUT
          echo "dev esta ${DIFF} commits por delante de main"

      - name: Close existing release PRs
        if: steps.check.outputs.commits_ahead != '0'
        run: |
          gh pr list --head dev --base main --state open --json number --jq '.[].number' | while read num; do
            echo "Cerrando PR de release existente #${num}"
            gh pr close "${num}" --comment "Reemplazado por un nuevo PR de release."
          done
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Compute next version
        if: steps.check.outputs.commits_ahead != '0'
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
        if: steps.check.outputs.commits_ahead != '0'
        run: |
          jq --arg v "${{ steps.version.outputs.version }}" '.version = $v' package.json > tmp.json && mv tmp.json package.json
          jq --arg v "${{ steps.version.outputs.version }}" '.version = $v' api/package.json > tmp.json && mv tmp.json api/package.json

      - name: Commit and push to dev
        if: steps.check.outputs.commits_ahead != '0'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add package.json api/package.json
          git commit -m "chore: bump version to v${{ steps.version.outputs.version }}"
          git push origin dev

      - name: Create release PR and enable auto-merge
        if: steps.check.outputs.commits_ahead != '0'
        run: |
          PR_URL=$(gh pr create \
            --title "Release v${{ steps.version.outputs.version }}" \
            --body "PR automatizada de release v${{ steps.version.outputs.version }}.\n\nTipo: \`${{ inputs.version }}\`." \
            --head dev \
            --base main)

          PR_NUMBER=$(echo "${PR_URL}" | grep -oP '\d+$')
          echo "PR creada: ${PR_URL}"

          gh pr merge "${PR_NUMBER}" --auto --merge
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Nothing to promote
        if: steps.check.outputs.commits_ahead == '0'
        run: echo "dev no tiene commits nuevos respecto a main, nada que publicar."
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/release.yml .github/workflows/publish.yml
git commit -m "refactor: unify release workflow with version selector"
```

---

### Task 2: Simplificar `publish.yml` (antes `release.yml`)

**Files:**
- Modify: `.github/workflows/publish.yml`

- [ ] **Step 1: Reemplazar los steps de extraccion de PR/labels y computo de version por lectura de package.json**

Eliminar los steps `Extract PR number` y `Get PR labels and determine bump` y `Compute next version from tags`. Sustituir por un step que lee la version de `package.json`.

- [ ] **Step 2: Editar `.github/workflows/publish.yml`**

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

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/publish.yml
git commit -m "refactor: simplify publish to read version from package.json"
```

---

### Task 3: Eliminar `promote.yml`

**Files:**
- Delete: `.github/workflows/promote.yml`

- [ ] **Step 1: Eliminar el archivo**

```bash
git rm .github/workflows/promote.yml
```

- [ ] **Step 2: Commit**

```bash
git commit -m "chore: remove promote workflow, replaced by release.yml"
```

---

### Task 4: Eliminar `check-labels` de `ci.yml`

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Eliminar el job `check-labels`, quitar `labeled`/`unlabeled` de triggers, y eliminar `if` redundantes**

El job `check-labels` son las lineas 11-28. Los triggers `labeled`/`unlabeled` en la linea 7. Los `if` en los jobs `backend`/`frontend`/`e2e` existen solo para saltar eventos `labeled`/`unlabeled`; al quitarlos, los `if` son dead code y se eliminan tambien.

Archivo resultante (`ci.yml` completo):

```yaml
name: CI

on:
  push:
    branches: [main, dev]
  pull_request:
    types: [opened, synchronize, reopened]
    branches: [main, dev]

jobs:
  backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: api
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: api/package-lock.json
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm test

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: package-lock.json
      - run: npm ci
      - run: npm test
      - run: npm run build

  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4

      - name: Build and start E2E stack
        run: docker compose -f docker-compose.e2e.yml up -d --build

      - name: Wait for services to be healthy
        run: |
          echo "Waiting for services..."
          for i in $(seq 1 60); do
            if curl -sf http://localhost:3001/api/health > /dev/null && \
               curl -sf http://localhost:5173/ > /dev/null; then
              echo "Services ready"
              exit 0
            fi
            echo "  attempt $i/60..."
            sleep 5
          done
          echo "Services did not become healthy"
          docker compose -f docker-compose.e2e.yml logs
          exit 1

      - name: Run Playwright tests
        run: docker compose -f docker-compose.e2e.yml run --rm playwright

      - name: Collect logs on failure
        if: failure()
        run: docker compose -f docker-compose.e2e.yml logs

      - name: Tear down
        if: always()
        run: docker compose -f docker-compose.e2e.yml down -v
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "refactor: remove check-labels job and simplify CI conditions"
```

---

### Task 5: Actualizar proteccion de ramas (manual)

**Files:**
- Ninguno (cambio en GitHub Settings)

- [ ] **Step 1: Quitar `check-labels` de los checks requeridos en `main`**

En GitHub: Settings → Branches → Branch protection rules → `main` → Edit → "Require status checks to pass before merging" → quitar `check-labels` de la lista → Save changes.

- [ ] **Step 2: Quitar `check-labels` de los checks requeridos en `dev`**

Mismo proceso para la rama `dev`.

---

### Task 6: Verificar el flujo CI tras los cambios

**Files:**
- Ninguno

- [ ] **Step 1: Verificar que CI pasa en este PR sin `check-labels`**

```bash
gh pr checks
```

Esperado: `backend`, `frontend`, `e2e` pasan. `check-labels` ya no aparece.

- [ ] **Step 2: Verificar manualmente la sintaxis YAML de los workflows**

```bash
gh workflow run release.yml --ref HEAD --field version=patch 2>&1 || echo "Workflow no se puede disparar hasta estar en dev (esperado)"
```

Verificar que GitHub reconoce el workflow (debe aparecer en la lista de workflows disponibles).

---

### Task 7: Probar push directo a `dev` (riesgo identificado en spec)

**Files:**
- Ninguno

- [ ] **Step 1: Verificar si `dev` permite push directo desde CI**

Revisar los logs de una ejecucion del workflow `release.yml` despues de mergear este PR a `dev`. Si el step `Commit and push to dev` falla con "remote rejected", aplicar plan B (Task 8). Si pasa, el flujo esta completo.

---

### Task 8 (Plan B): Release branch si dev no permite push directo

**Files:**
- Modify: `.github/workflows/release.yml`

Solo si el step `Commit and push to dev` falla por branch protection.

- [ ] **Step 1: Reemplazar step `Commit and push to dev` y `Create release PR` en `release.yml`**

```yaml
      - name: Create release branch
        if: steps.check.outputs.commits_ahead != '0'
        id: branch
        run: |
          BRANCH="release/v${{ steps.version.outputs.version }}"
          git checkout -b "${BRANCH}"
          echo "branch=${BRANCH}" >> $GITHUB_OUTPUT

      - name: Commit and push release branch
        if: steps.check.outputs.commits_ahead != '0'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add package.json api/package.json
          git commit -m "chore: bump version to v${{ steps.version.outputs.version }}"
          git push origin "${{ steps.branch.outputs.branch }}"

      - name: Create PR release branch → dev and auto-merge
        if: steps.check.outputs.commits_ahead != '0'
        run: |
          PR_URL=$(gh pr create \
            --title "chore: bump version to v${{ steps.version.outputs.version }}" \
            --body "Actualiza version en package.json a v${{ steps.version.outputs.version }}." \
            --head "${{ steps.branch.outputs.branch }}" \
            --base dev)

          PR_NUMBER=$(echo "${PR_URL}" | grep -oP '\d+$')
          echo "PR dev creada: ${PR_URL}"
          gh pr merge "${PR_NUMBER}" --auto --merge
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Wait for release branch PR to merge
        if: steps.check.outputs.commits_ahead != '0'
        run: |
          for i in $(seq 1 30); do
            STATE=$(gh pr view "${{ steps.branch.outputs.branch }}" --base dev --json state --jq '.state' 2>/dev/null || echo "OPEN")
            if [ "${STATE}" = "MERGED" ]; then
              echo "PR a dev mergeada"
              exit 0
            fi
            echo "Esperando merge de PR a dev... intento $i/30"
            sleep 10
          done
          echo "Timeout esperando merge de PR a dev"
          exit 1
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Create release PR dev → main and auto-merge
        if: steps.check.outputs.commits_ahead != '0'
        run: |
          git fetch origin dev
          git checkout origin/dev

          PR_URL=$(gh pr create \
            --title "Release v${{ steps.version.outputs.version }}" \
            --body "PR automatizada de release v${{ steps.version.outputs.version }}.\n\nTipo: \`${{ inputs.version }}\`." \
            --head dev \
            --base main)

          PR_NUMBER=$(echo "${PR_URL}" | grep -oP '\d+$')
          echo "PR main creada: ${PR_URL}"
          gh pr merge "${PR_NUMBER}" --auto --merge
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "fix: use release branch if dev push is blocked"
```
