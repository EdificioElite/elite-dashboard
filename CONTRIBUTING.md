# Contributing

Guía para contribuir al proyecto Edificio Elite.

## Flujo de trabajo

- **Siempre trabajar en ramas**: `feat/`, `fix/`, `docs/`, `chore/` desde `main`
- **Siempre crear PR** para mergear a `main`. Nunca push directo a `main`.
- **Siempre revisar los comentarios de Copilot en el PR** y resolver los issues que señale antes de pedir review humana. Copilot revisa automáticamente cada PR y deja comentarios inline.
- Para publicar una release, ejecutar manualmente el workflow `Release` (`.github/workflows/release.yml`)
  - Seleccionar el tipo de versión (`major`, `minor`, `patch`)
  - El workflow calcula el nuevo tag, lo crea en `main`, publica la GitHub Release y construye la imagen Docker `:X.Y.Z` y `:latest`

## Ramas protegidas

`main` requiere PR antes de merge y que pasen los checks:
`backend`, `frontend`, `e2e`

## Entornos

| Rama | Entorno | URL | Backend |
|---|---|---|---|
| `main` | Production | www.edificioelite.com | api.edificioelite.com |
| PR | Preview/Dev | dev.edificioelite.com | api-dev.edificioelite.com |

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) ejecuta en cada push y PR a `main`:
- Backend: typecheck + tests
- Frontend: tests + build
- E2E: stack docker-compose + Playwright

Release (`.github/workflows/release.yml`): workflow_dispatch manual con selector de versión:
- Calcula la siguiente versión semver desde el último tag
- Crea y pushea el tag `vX.Y.Z` en main
- Crea la GitHub Release con notas generadas automáticamente
- Publica imagen Docker `:X.Y.Z` y `:latest`

Docker PR (`.github/workflows/docker-pr.yml`): en cada PR se construye la imagen `:dev` para el entorno de preview.
