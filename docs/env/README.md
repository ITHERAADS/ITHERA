# Variables de entorno - ITHERA

Esta guia centraliza las variables usadas por backend, frontend, GitHub Actions y Vercel.

## Reglas generales

- Nunca subir `.env` al repositorio.
- Mantener `.env.example` actualizado cuando se agregue una variable.
- Las variables del frontend deben empezar con `VITE_`.
- No colocar secrets privados en variables `VITE_`, porque quedan disponibles en el navegador.
- Los secrets de CI/CD se configuran en GitHub Actions o Vercel, no en archivos del repo.

## Backend

Archivo local:

```text
backend/.env
```

Base:

| Variable | Obligatoria | Uso |
| --- | --- | --- |
| `SUPABASE_URL` | Si | URL del proyecto Supabase. |
| `SUPABASE_ANON_KEY` | Si | Llave anonima para flujos auth. |
| `SUPABASE_SECRET_KEY` | Si | Service role para operaciones internas del backend. |
| `PORT` | No | Puerto HTTP. Default `3001`. |
| `NODE_ENV` | No | Ambiente. Default `development`. |
| `FRONTEND_URL` | No | Origen permitido por CORS. Default `http://localhost:5173`. |
| `LOCK_TTL_MINUTES` | No | TTL para locks de propuestas. Default `10`. |

Integraciones:

| Variable | Uso |
| --- | --- |
| `DUFFEL_ACCESS_TOKEN` | Credencial Duffel para vuelos. |
| `DUFFEL_BASE_URL` | URL base Duffel. |
| `DUFFEL_API_VERSION` | Version API Duffel. |
| `LITEAPI_BASE_URL` | URL base LiteAPI. |
| `LITEAPI_API_KEY` | Credencial LiteAPI para hoteles. |
| `AMADEUS_BASE_URL` | URL base Amadeus. |
| `AMADEUS_AUTH_URL` | URL auth Amadeus. |
| `AMADEUS_CLIENT_ID` | Client ID Amadeus. |
| `AMADEUS_CLIENT_SECRET` | Client secret Amadeus. |
| `GOOGLE_MAPS_API_KEY` | Llave servidor Google Maps. |
| `GOOGLE_MAPS_BASE_URL` | URL base Maps. |
| `GOOGLE_ROUTES_BASE_URL` | URL base Routes. |
| `GOOGLE_PLACES_BASE_URL` | URL base Places. |
| `OPEN_METEO_BASE_URL` | URL base Open-Meteo. |
| `WEATHER_API_KEY` | Llave WeatherAPI. |
| `WEATHER_CACHE_TTL_MS` | TTL cache clima. |
| `WEATHER_API_BASE_URL` | URL base WeatherAPI. |
| `RESEND_API_KEY` | Llave Resend. |
| `MAIL_FROM` | Remitente de correos. |

## Frontend

Archivo local:

```text
frontend/.env
```

| Variable | Obligatoria | Uso |
| --- | --- | --- |
| `VITE_API_URL` | Si | URL base API. Local: `http://localhost:3001/api`. |
| `VITE_SUPABASE_URL` | Si | URL publica de Supabase. |
| `VITE_SUPABASE_ANON_KEY` | Si | Llave anonima publica de Supabase. |
| `VITE_GOOGLE_MAPS_BROWSER_KEY` | Segun modulo | Llave de Google Maps para navegador. |

## GitHub Actions y Vercel

Secrets usados por workflows de Vercel:

| Secret | Uso |
| --- | --- |
| `VERCEL_TOKEN` | Autentica Vercel CLI. |
| `VERCEL_ORG_ID` | Identifica equipo/organizacion. |
| `VERCEL_PROJECT_ID_FRONTEND` | Identifica proyecto frontend. |

## Checklist al agregar variable

1. Agregarla a `.env.example` del paquete correspondiente.
2. Documentarla aqui.
3. Si afecta deploy, agregarla en Vercel/GitHub.
4. Si es backend, leerla desde `backend/src/config/env.ts`.
5. Si es frontend, verificar que sea seguro exponerla como `VITE_`.
