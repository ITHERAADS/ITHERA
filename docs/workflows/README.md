# Workflows - Ithera

Este documento explica los workflows de GitHub Actions del repositorio. Sirve para saber que se ejecuta, cuando se ejecuta, que secrets requiere y como actuar si algo falla.

## Resumen

| Workflow | Archivo | Trigger | Objetivo |
| --- | --- | --- | --- |
| CI Backend | `.github/workflows/ci-backend.yml` | Pull request hacia `main` o `develop` | Validar backend con lint, type check, build y tests. |
| CI Frontend | `.github/workflows/ci-frontend.yml` | Pull request hacia `main` o `develop` | Validar frontend con lint, type check y build. |
| Vercel Frontend Preview | `.github/workflows/vercel-frontend-preview.yml` | Pull request hacia `develop` | Crear preview deploy del frontend y comentar URL en el PR. |
| Vercel Frontend Production | `.github/workflows/vercel-frontend-production.yml` | Push a `develop` o ejecucion manual | Desplegar frontend en produccion con Vercel. |

## CI Backend

Archivo:

```text
.github/workflows/ci-backend.yml
```

Se ejecuta en pull requests hacia:

- `main`
- `develop`

Se dispara si cambian:

- `.github/workflows/**`
- `backend/**`
- `package.json`
- `package-lock.json`
- `README.md`
- `docs/**`

Pasos principales:

1. Checkout del repositorio.
2. Setup de Node.js 20.
3. Cache npm usando `backend/package-lock.json`.
4. `npm ci`.
5. `npm run lint`.
6. `npx tsc --noEmit`.
7. `npm run build`.
8. `npm test -- --runInBand`.

Variables de ambiente configuradas para CI:

```text
NODE_ENV=test
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=test-anon-key
SUPABASE_SECRET_KEY=test-service-role-key
FRONTEND_URL=http://localhost:5173
PORT=3001
LOCK_TTL_MINUTES=10
```

Notas:

- El lint de backend actualmente es placeholder en `backend/package.json`.
- Los tests corren con Jest y `--passWithNoTests`.
- Si se agrega una dependencia, actualizar `backend/package-lock.json`.

## CI Frontend

Archivo:

```text
.github/workflows/ci-frontend.yml
```

Se ejecuta en pull requests hacia:

- `main`
- `develop`

Se dispara si cambian:

- `.github/workflows/**`
- `frontend/**`
- `package.json`
- `package-lock.json`
- `README.md`
- `docs/**`

Pasos principales:

1. Checkout del repositorio.
2. Setup de Node.js 20.
3. Cache npm usando `frontend/package-lock.json`.
4. `npm ci`.
5. `npm run lint`.
6. `npx tsc --noEmit`.
7. `npm run build`.

Notas:

- `npm run build` ejecuta `tsc -b && vite build`.
- Errores de build suelen venir de tipos, imports rotos o variables mal usadas.
- Si se agrega una dependencia, actualizar `frontend/package-lock.json`.

## Vercel Frontend Preview

Archivo:

```text
.github/workflows/vercel-frontend-preview.yml
```

Se ejecuta en pull requests hacia:

- `develop`

Se dispara si cambian:

- `frontend/**`
- `.github/workflows/vercel-frontend-preview.yml`

Condicion adicional:

```text
github.event.pull_request.head.repo.fork == false
```

Esto evita ejecutar deploys con secrets en PRs provenientes de forks.

Pasos principales:

1. Checkout.
2. Setup Node.js 20.
3. Instalar Vercel CLI.
4. `vercel pull --environment=preview`.
5. `vercel deploy`.
6. Comentar o actualizar la URL preview en el PR.

Secrets requeridos:

| Secret | Uso |
| --- | --- |
| `VERCEL_TOKEN` | Autenticar Vercel CLI. |
| `VERCEL_ORG_ID` | Identificar equipo/organizacion en Vercel. |
| `VERCEL_PROJECT_ID_FRONTEND` | Identificar proyecto frontend en Vercel. |

Permisos del job:

```yaml
contents: read
pull-requests: write
```

El permiso de PR permite comentar la URL preview.

## Vercel Frontend Production

Archivo:

```text
.github/workflows/vercel-frontend-production.yml
```

Se ejecuta cuando:

- Hay push a `develop` con cambios en `frontend/**` o el workflow.
- Alguien lo ejecuta manualmente con `workflow_dispatch`.

Pasos principales:

1. Checkout.
2. Setup Node.js 20.
3. Instalar Vercel CLI.
4. `vercel pull --environment=production`.
5. `vercel deploy --prod`.

Secrets requeridos:

| Secret | Uso |
| --- | --- |
| `VERCEL_TOKEN` | Autenticar Vercel CLI. |
| `VERCEL_ORG_ID` | Identificar equipo/organizacion en Vercel. |
| `VERCEL_PROJECT_ID_FRONTEND` | Identificar proyecto frontend en Vercel. |

## Que hacer si falla un workflow

| Falla | Accion recomendada |
| --- | --- |
| `npm ci` | Revisar que `package-lock.json` corresponda a `package.json`. Ejecutar `npm install` en el paquete afectado y commitear lockfile. |
| `npm run lint` | Correr el lint local en `backend` o `frontend` y corregir errores reportados. |
| `npx tsc --noEmit` | Revisar archivo y linea del error de TypeScript. |
| `npm run build` | Verificar imports, tipos, variables de entorno y errores de Vite. |
| `npm test` | Reproducir local con `npm test -- --runInBand`. |
| `vercel pull` | Verificar `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID_FRONTEND`. |
| `vercel deploy` | Revisar logs del job y configuracion del proyecto en Vercel. |
| Comentario preview no aparece | Revisar permisos `pull-requests: write` y que el PR no venga de fork. |

## Reglas para modificar workflows

- Cambiar un workflow requiere PR y revision.
- Documentar el cambio en este archivo.
- No imprimir secrets en logs.
- Preferir Node.js 20 para mantener consistencia.
- Si se agrega un check requerido, actualizar reglas de branch protection y `CONTRIBUTING.md`.
- Si se agrega un nuevo secret, documentar nombre, uso y ambiente.

## Relacion con GitFlow

- Los PRs normales apuntan a `develop`.
- `ci-backend.yml` y `ci-frontend.yml` deben pasar antes de mergear.
- Los preview deploys ayudan a revisar cambios visuales antes del merge.
- El deploy production actual se ejecuta desde `develop`; si el equipo cambia a releases desde `main`, tambien debe cambiarse este workflow y documentarse aqui.
