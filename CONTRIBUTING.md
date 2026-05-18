# Contributing

Guia para contribuir al proyecto Edificio Elite.

## Flujo de trabajo

- **Siempre trabajar en ramas**: `feat/`, `fix/`, `docs/`, `chore/` desde `dev`
- **Siempre crear PR** para mergear a `dev`. Nunca push directo a `dev` ni a `main`.
- **Siempre revisar los comentarios de Copilot en el PR** y resolver los issues que señale antes de pedir review humana. Copilot revisa automaticamente cada PR y deja comentarios inline.
- Para promocionar a produccion, ejecutar manualmente el workflow `Release` (`.github/workflows/release.yml`)
  - Seleccionar el tipo de version (`major`, `minor`, `patch`)
  - El workflow crea automaticamente un PR de `dev` → `main`, espera a que el auto-merge lo cierre, y publica tag + release + imagen Docker
- Tras merge a `main`, el workflow `Sync main to dev` crea automaticamente un PR de `main` → `dev`
  para sincronizar version bumps, hotfixes y releases de vuelta a dev

## Ramas protegidas

`main` y `dev` requieren PR antes de merge y que pasen los checks:
`backend`, `frontend`, `e2e`

## Entornos

| Rama | Entorno | URL | Backend |
|---|---|---|---|
| `dev` | Preview/Dev | dev.edificioelite.com | api-dev.edificioelite.com |
| `main` | Production | www.edificioelite.com | api.edificioelite.com |

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) ejecuta en cada push y PR a `main` y `dev`:
- Backend: typecheck + tests
- Frontend: tests + build
- E2E: stack docker-compose + Playwright

Release (`.github/workflows/release.yml`): workflow_dispatch manual con selector de version:
- Crea PR de `dev` → `main` y activa auto-merge
- Al mergear, publica tag, GitHub Release e imagen Docker `:vX.Y.Z` y `:latest`

Sync (`.github/workflows/sync.yml`): auto back-merge `main` → `dev` tras cada release
