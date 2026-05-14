# Arquitectura - Ithera

Esta guia resume la organizacion tecnica actual del proyecto. Para pasos de instalacion y scripts, consulta tambien [../../README.md](../../README.md), [../../backend/README.md](../../backend/README.md) y [../../frontend/README.md](../../frontend/README.md).

## Vista general

```text
Frontend React/Vite
  -> services/apiClient
  -> Backend Express /api
  -> Domain services
  -> Supabase o APIs externas

Socket.IO
  -> Backend HTTP server
  -> socket handlers
  -> Hooks frontend de realtime
```

## Principios de organizacion

- El backend separa rutas, dominio e infraestructura.
- El frontend separa paginas, componentes, servicios, hooks, contextos y tipos.
- La documentacion funcional de endpoints vive en `docs/api`.
- Las reglas de colaboracion viven en `CONTRIBUTING.md`.
- Los workflows se explican en `docs/workflows`.

## Backend

La entrada principal es `backend/src/index.ts`.

Capas:

| Capa | Ubicacion | Responsabilidad |
| --- | --- | --- |
| Configuracion | `backend/src/config` | Leer ambiente y preparar configuracion base. |
| Rutas | `backend/src/routes` | Definir endpoints Express y delegar. |
| Middlewares | `backend/src/middlewares` | Auth, errores y protecciones transversales. |
| Dominio | `backend/src/domain` | Reglas de negocio por modulo. |
| Infraestructura | `backend/src/infrastructure` | Supabase, sockets, APIs externas y email. |
| Servicios compartidos | `backend/src/services` | Funciones transversales que no pertenecen a un dominio unico. |

Regla de dependencia recomendada:

```text
routes -> middlewares -> domain -> infrastructure
```

Evitar que `routes` contenga logica de negocio compleja o que `domain` dependa de detalles visuales del frontend.

## Frontend

La entrada principal es `frontend/src/main.tsx` y las rutas viven en `frontend/src/App.tsx`.

Capas:

| Capa | Ubicacion | Responsabilidad |
| --- | --- | --- |
| Pages | `frontend/src/pages` | Vistas completas asociadas a rutas. |
| Components | `frontend/src/components` | Piezas reutilizables de UI y flujo. |
| UI primitives | `frontend/src/components/ui` | Componentes genericos de bajo nivel. |
| Services | `frontend/src/services` | Consumo de API por modulo. |
| Hooks | `frontend/src/hooks` | Reutilizacion de estado, sockets, red y sincronizacion. |
| Context | `frontend/src/context` | Estado global de auth y viaje. |
| Types | `frontend/src/types` | Tipos compartidos. |
| Lib | `frontend/src/lib` | Clientes base como Supabase. |

Regla recomendada:

```text
pages -> components/hooks/services -> types/lib
```

Las paginas pueden orquestar datos y estado. Los componentes reutilizables deben recibir props claras y evitar acoplarse a rutas cuando no sea necesario.

## Modulos actuales

| Modulo | Backend | Frontend |
| --- | --- | --- |
| Auth | `domain/auth`, `routes/auth.router.ts` | `pages/Login`, `pages/Register`, `pages/OTP`, `components/auth` |
| Grupos | `domain/groups`, `routes/trips.router.ts` | `pages/MyTrips`, `pages/CreateGroup`, `pages/JoinGroup`, `pages/GroupPanel` |
| Itinerario | `domain/itinerary` | `pages/Itinerary` |
| Propuestas | `domain/proposals`, `domain/votes-comments` | `components/ProposalCard`, modales de propuestas |
| Busqueda | `domain/flights`, `domain/hotels`, `domain/maps` | `pages/Search` |
| Presupuesto | `domain/budget` | `components/budget` |
| Checkout | `domain/checkout` | `pages/Checkout`, `components/checkout` |
| Documentos | `domain/documents` | `components/documents` |
| Notificaciones | `domain/notifications` | `hooks/useNotifications.ts` |
| Tiempo real | `infrastructure/sockets` | `hooks/useSocket.ts`, `hooks/useGroupRealtimeRefresh.ts` |

## Reglas para cambios estructurales

- Si se agrega un modulo backend, crear `domain`, `route` y documentar endpoint.
- Si se agrega una pagina frontend, registrarla en `App.tsx` y ubicarla en `pages/<Nombre>`.
- Si se agrega un servicio externo, documentar variable de entorno y adaptador.
- Si se agrega un evento Socket.IO, documentar que lo emite y que hook lo consume.
- Si se cambia un workflow, actualizar `docs/workflows/README.md`.
