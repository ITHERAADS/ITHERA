# Backend - Ithera

Backend de Ithera construido con Node.js, TypeScript, Express, Supabase y Socket.IO. Expone la API REST, integra servicios externos y mantiene la sincronizacion en tiempo real para grupos, propuestas, presupuesto, documentos y notificaciones.

## Responsabilidades

- Exponer endpoints REST bajo `/api`.
- Validar autenticacion y permisos.
- Orquestar logica de negocio por dominio.
- Integrar Supabase como backend de datos/autenticacion.
- Integrar proveedores externos de vuelos, hoteles, mapas, clima y correo.
- Publicar eventos en tiempo real mediante Socket.IO.
- Centralizar manejo de errores y configuracion de ambiente.

## Stack

| Area | Tecnologia |
| --- | --- |
| Runtime | Node.js |
| Lenguaje | TypeScript |
| HTTP API | Express |
| Base de datos/auth | Supabase |
| Tiempo real | Socket.IO |
| Email | Resend |
| Testing | Jest, ts-jest |
| Desarrollo | ts-node-dev |

## Estructura

```text
backend/
|-- src/
|   |-- config/
|   |   |-- db.ts                  # Configuracion relacionada con base de datos
|   |   |-- env.ts                 # Lectura centralizada de variables de entorno
|   |   `-- redis.ts               # Configuracion heredada o preparada para Redis
|   |-- domain/
|   |   |-- auth/                  # Registro, login, perfil y recuperacion
|   |   |-- budget/                # Gastos, saldos y presupuesto
|   |   |-- checkout/              # Checkout, PDF y simulacion de pagos
|   |   |-- context-links/         # Enlaces contextuales por grupo
|   |   |-- documents/             # Boveda y documentos
|   |   |-- flights/               # Busqueda de vuelos y aeropuertos
|   |   |-- groups/                # Grupos, chat e integrantes
|   |   |-- hotels/                # Busqueda de hoteles
|   |   |-- itinerary/             # Itinerario y agenda de subgrupos
|   |   |-- maps/                  # Mapas, rutas y lugares
|   |   |-- notifications/         # Notificaciones
|   |   |-- proposals/             # Propuestas y bloqueos
|   |   `-- votes-comments/        # Votos y comentarios
|   |-- infrastructure/
|   |   |-- db/                    # Cliente Supabase y migraciones
|   |   |-- email/                 # Templates y adaptadores de email
|   |   |-- external-apis/         # Amadeus, Duffel, Google, LiteAPI, clima
|   |   |-- redis/                 # Cliente Redis si se habilita
|   |   `-- sockets/               # Gateway, handlers, server y scheduler
|   |-- middlewares/
|   |   |-- auth.middleware.ts
|   |   |-- errorHandler.middleware.ts
|   |   `-- rateLimit.middleware.ts
|   |-- routes/                    # Routers Express por modulo
|   |-- services/                  # Servicios transversales
|   `-- index.ts                   # Bootstrap HTTP, CORS, rutas y Socket.IO
|-- tests/
|-- package.json
|-- tsconfig.json
`-- jest.config.ts
```

## Flujo de una peticion

```text
Cliente frontend
  -> Express route en src/routes
  -> Middleware de auth/validacion si aplica
  -> Servicio de dominio en src/domain/<modulo>
  -> Cliente Supabase o adaptador externo
  -> Respuesta JSON o evento Socket.IO
```

Regla practica: las rutas deben ser delgadas. La logica de negocio vive en `src/domain/<modulo>`, y las dependencias externas viven en `src/infrastructure`.

## Endpoints base

El servidor registra estas rutas principales desde `src/index.ts`:

| Base path | Modulo |
| --- | --- |
| `/health` | Healthcheck |
| `/api/auth` | Autenticacion |
| `/api/groups` | Grupos/viajes |
| `/api/groups/:groupId/context-links` | Enlaces contextuales |
| `/api/groups/:groupId/documents` | Documentos por grupo |
| `/api/groups/:groupId/vault` | Boveda por grupo |
| `/api/flights` | Vuelos |
| `/api/hotels` | Hoteles |
| `/api/maps` | Mapas, lugares, rutas y clima |
| `/api/proposals` | Propuestas, votos y comentarios |
| `/api/budget` | Presupuesto |
| `/api/notifications` | Notificaciones |
| `/api/documents` | Documentos generales |
| `/api/checkout` | Checkout |

La documentacion funcional de endpoints vive en [../docs/api/endpoints.md](../docs/api/endpoints.md).

## Variables de entorno

Crear `backend/.env` a partir de `backend/.env.example`.

| Variable | Uso |
| --- | --- |
| `SUPABASE_URL` | URL del proyecto Supabase. |
| `SUPABASE_ANON_KEY` | Llave anonima de Supabase. |
| `SUPABASE_SECRET_KEY` | Llave service role para operaciones backend. |
| `PORT` | Puerto HTTP del backend. Por defecto `3001`. |
| `NODE_ENV` | Ambiente de ejecucion. |
| `FRONTEND_URL` | Origen permitido para CORS local. |
| `DUFFEL_ACCESS_TOKEN` | Credencial para Duffel. |
| `DUFFEL_BASE_URL` | URL base de Duffel. |
| `DUFFEL_API_VERSION` | Version de API Duffel. |
| `LITEAPI_BASE_URL` | URL base de LiteAPI. |
| `LITEAPI_API_KEY` | Llave de LiteAPI. |
| `AMADEUS_BASE_URL` | URL base de Amadeus. |
| `AMADEUS_AUTH_URL` | URL de autenticacion Amadeus. |
| `AMADEUS_CLIENT_ID` | Client ID de Amadeus. |
| `AMADEUS_CLIENT_SECRET` | Client secret de Amadeus. |
| `GOOGLE_MAPS_API_KEY` | Llave servidor para Google Maps. |
| `GOOGLE_MAPS_BASE_URL` | URL base Maps. |
| `GOOGLE_ROUTES_BASE_URL` | URL base Routes. |
| `GOOGLE_PLACES_BASE_URL` | URL base Places. |
| `OPEN_METEO_BASE_URL` | URL base de Open-Meteo. |
| `WEATHER_API_KEY` | Llave de WeatherAPI. |
| `WEATHER_CACHE_TTL_MS` | TTL de cache para clima. |
| `WEATHER_API_BASE_URL` | URL base de WeatherAPI. |
| `RESEND_API_KEY` | Llave de Resend. |
| `MAIL_FROM` | Remitente de correos transaccionales. |

Nunca subir `.env` al repositorio.

## Instalacion y ejecucion

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Healthcheck:

```bash
curl http://localhost:3001/health
```

## Scripts

| Script | Uso |
| --- | --- |
| `npm run dev` | Levanta el servidor con recarga usando `ts-node-dev`. |
| `npm run build` | Compila TypeScript a `dist`. |
| `npm run start` | Ejecuta `dist/index.js`. |
| `npm run test` | Corre Jest. Usa `--passWithNoTests`. |
| `npm run lint` | Actualmente es placeholder: `echo "No lint configured"`. |

## Convenciones para agregar un modulo

1. Crear carpeta en `src/domain/<modulo>`.
2. Separar entidades/tipos del servicio cuando aplique: `<modulo>.entity.ts` y `<modulo>.service.ts`.
3. Crear router en `src/routes/<modulo>.router.ts`.
4. Registrar el router en `src/index.ts` bajo `/api/<modulo>`.
5. Si consume servicios externos, crear el adaptador en `src/infrastructure/external-apis`.
6. Si emite eventos en tiempo real, coordinar con `src/infrastructure/sockets`.
7. Documentar endpoints nuevos en [../docs/api/endpoints.md](../docs/api/endpoints.md).
8. Agregar o actualizar pruebas cuando el cambio tenga reglas de negocio o riesgo de regresion.

## Socket.IO

Socket.IO se inicializa en `src/index.ts` con `initSocketServer(httpServer)`. La implementacion vive en:

- `src/infrastructure/sockets/socket.server.ts`
- `src/infrastructure/sockets/socket.gateway.ts`
- `src/infrastructure/sockets/socket.handlers.ts`
- `src/infrastructure/sockets/lock.scheduler.ts`

El scheduler de locks se arranca junto con el servidor HTTP. Cualquier cambio de eventos debe revisarse tambien en los hooks del frontend, especialmente `frontend/src/hooks/useSocket.ts` y `frontend/src/hooks/useGroupRealtimeRefresh.ts`.

## CI

El workflow `ci-backend.yml` corre en PRs hacia `main` o `develop` cuando cambian backend, docs, workflows o archivos raiz relevantes.

Valida:

- `npm ci`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `npm test -- --runInBand`

Mas detalle en [../docs/workflows/README.md](../docs/workflows/README.md).
