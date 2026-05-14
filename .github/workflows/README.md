# Workflows de GitHub Actions - Ithera

Esta carpeta contiene los workflows que automatizan CI y despliegues del frontend. Esta es solo una referencia rapida junto a los archivos `.yml`; la guia completa vive en [../../docs/workflows/README.md](../../docs/workflows/README.md).

## Resumen rapido

| Archivo | Cuando corre | Proposito |
| --- | --- | --- |
| `ci-backend.yml` | PR hacia `main` o `develop` con cambios relevantes | Valida backend: dependencias, lint, type check, build y tests. |
| `ci-frontend.yml` | PR hacia `main` o `develop` con cambios relevantes | Valida frontend: dependencias, lint, type check y build. |
| `vercel-frontend-preview.yml` | PR hacia `develop` con cambios en `frontend` | Genera preview deploy en Vercel y comenta la URL en el PR. |
| `vercel-frontend-production.yml` | Push a `develop` con cambios en `frontend` o ejecucion manual | Despliega el frontend a produccion en Vercel. |

## Secrets usados por Vercel

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID_FRONTEND`

## Regla de mantenimiento

Si cambias triggers, pasos, secrets o comportamiento de algun workflow, actualiza la guia completa en [../../docs/workflows/README.md](../../docs/workflows/README.md).
