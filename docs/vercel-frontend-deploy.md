# Deploy frontend en Vercel (PR preview + production)

Este repo ya incluye dos workflows:

- `.github/workflows/vercel-frontend-preview.yml`
  - Se ejecuta en cada `pull_request` a `develop` cuando hay cambios en `frontend/**`.
  - Publica un preview deployment en Vercel.
  - Actualiza un comentario en el PR con la URL del preview.

- `.github/workflows/vercel-frontend-production.yml`
  - Se ejecuta en `push` a `develop` cuando hay cambios en `frontend/**`.
  - Publica deployment de production en Vercel.

## Secrets requeridos en GitHub

Configura estos secrets en el repo (`Settings > Secrets and variables > Actions`):

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID_FRONTEND`

## Como obtener IDs en Vercel

1. Abre tu proyecto en Vercel.
2. Ve a `Settings > General`.
3. Copia:
   - `Project ID` -> `VERCEL_PROJECT_ID_FRONTEND`
   - `Team ID` (o personal account ID) -> `VERCEL_ORG_ID`
4. Genera un token en `Vercel Account Settings > Tokens` -> `VERCEL_TOKEN`.

## Nota de routing SPA

El archivo `frontend/vercel.json` incluye rewrite global a `index.html` para que rutas de React Router funcionen al refrescar:

- `/dashboard`
- `/itinerary`
- `/groups/...`

sin 404 en Vercel.
