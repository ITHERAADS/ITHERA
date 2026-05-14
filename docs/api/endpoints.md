# ITHERA - Endpoints REST API

Este documento registra los endpoints expuestos por el backend actual. Debe actualizarse en el mismo PR donde se agregue, cambie o elimine un endpoint.

## Convenciones

| Elemento | Valor |
| --- | --- |
| Backend local | `http://localhost:3001` |
| Base API local | `http://localhost:3001/api` |
| Healthcheck | `GET http://localhost:3001/health` |
| Formato principal | JSON |
| Auth protegida | `Authorization: Bearer <token>` |
| Uploads | `multipart/form-data` cuando el endpoint recibe archivos |

Codigos comunes:

| Codigo | Uso |
| --- | --- |
| `200 OK` | Operacion exitosa. |
| `201 Created` | Recurso creado. |
| `400 Bad Request` | Payload, parametros o query invalidos. |
| `401 Unauthorized` | Token ausente o invalido. |
| `403 Forbidden` | Usuario sin permisos suficientes. |
| `404 Not Found` | Recurso inexistente. |
| `409 Conflict` | Conflicto de negocio, por ejemplo correo ya registrado. |
| `429 Too Many Requests` | Rate limit o bloqueo temporal. |
| `500 Internal Server Error` | Error no controlado. |

## Bases montadas

| Base path | Router | Archivo |
| --- | --- | --- |
| `/api/auth` | Auth | `backend/src/routes/auth.router.ts` |
| `/api/groups` | Grupos/viajes | `backend/src/routes/trips.router.ts` |
| `/api/groups/:groupId/itinerary` | Itinerario | `backend/src/routes/itinerary.router.ts` |
| `/api/groups/:groupId/chat` | Chat grupal | `backend/src/routes/chat.router.ts` |
| `/api/groups/:groupId/context-links` | Enlaces contextuales | `backend/src/routes/context-links.router.ts` |
| `/api/groups/:groupId/documents` | Documentos por grupo | `backend/src/routes/documents.router.ts` |
| `/api/groups/:groupId/vault` | Alias de boveda documental | `backend/src/routes/documents.router.ts` |
| `/api/groups/:groupId/budget` | Presupuesto dentro de grupo | `backend/src/routes/budget.router.ts` |
| `/api/flights` | Vuelos | `backend/src/routes/flights.router.ts` |
| `/api/hotels` | Hoteles | `backend/src/routes/hotels.router.ts` |
| `/api/maps` | Mapas, lugares, rutas y clima | `backend/src/routes/maps.router.ts` |
| `/api/proposals` | Propuestas, votos y comentarios | `backend/src/routes/proposals.router.ts`, `votesComments.router.ts` |
| `/api/budget` | Alias directo de presupuesto | `backend/src/routes/budget.router.ts` |
| `/api/notifications` | Notificaciones | `backend/src/routes/notifications.router.ts` |
| `/api/documents` | Alias directo de documentos | `backend/src/routes/documents.router.ts` |
| `/api/checkout` | Checkout simulado | `backend/src/routes/checkout.router.ts` |

## Auth

Base: `/api/auth`

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| `GET` | `/email-availability?email=:email` | No | Verifica si un correo esta disponible. |
| `POST` | `/register` | No | Registra usuario con correo, password y nombre completo. |
| `POST` | `/login` | No | Inicia sesion y devuelve sesion/usuario de Supabase. |
| `POST` | `/forgot-password` | No | Solicita correo de recuperacion de contrasena. |
| `POST` | `/sync-user` | Si | Sincroniza usuario autenticado de Supabase con tabla local. |
| `GET` | `/me` | Si | Obtiene perfil local del usuario autenticado. |
| `PATCH` | `/me` | Si | Actualiza nombre del perfil. |
| `PATCH` | `/me/avatar` | Si | Actualiza avatar. Recibe `multipart/form-data` con campo `avatar`. |
| `DELETE` | `/me/avatar` | Si | Elimina avatar del perfil. |
| `DELETE` | `/me` | Si | Elimina cuenta del usuario autenticado. |

## Grupos y viajes

Base: `/api/groups`

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| `POST` | `/` | Si | Crea un grupo/viaje. |
| `POST` | `/join` | Si | Solicita unirse o se une a un grupo mediante codigo. |
| `GET` | `/my-history` | Si | Lista historial de viajes del usuario. |
| `GET` | `/invite-preview/:code` | No | Obtiene vista previa publica de una invitacion. |
| `GET` | `/:groupId/travel-context` | Si | Obtiene contexto de viaje y punto de partida. |
| `GET` | `/:groupId` | Si | Obtiene detalle del grupo. |
| `PATCH` | `/:groupId` | Si | Actualiza datos del grupo. |
| `DELETE` | `/:groupId` | Si | Elimina grupo. |
| `GET` | `/:groupId/invite` | Si | Obtiene informacion de invitacion. |
| `GET` | `/:groupId/invitations` | Si | Lista invitaciones generadas. |
| `POST` | `/:groupId/invitations` | Si | Crea invitaciones por correo. |
| `GET` | `/:groupId/join-requests` | Si | Lista solicitudes de union pendientes. |
| `PATCH` | `/:groupId/join-requests/:requestId` | Si | Aprueba o rechaza una solicitud. Body: `action=approve|reject`. |
| `GET` | `/:groupId/qr` | Si | Genera QR de invitacion. |
| `GET` | `/:groupId/members` | Si | Lista integrantes del grupo. |
| `PATCH` | `/members/:memberId/role` | Si | Actualiza rol de integrante. |
| `DELETE` | `/:groupId/members/:memberId` | Si | Elimina integrante del grupo. |

## Itinerario

Base: `/api/groups/:groupId/itinerary`

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| `GET` | `/` | Si | Obtiene itinerario del grupo. |
| `POST` | `/activities` | Si | Crea actividad grupal. |
| `PATCH` | `/activities/:activityId` | Si | Actualiza actividad grupal. |
| `DELETE` | `/activities/:activityId` | Si | Elimina actividad grupal. |

### Agenda y subgrupos

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| `GET` | `/subgroups/schedule` | Si | Obtiene agenda de subgrupos. |
| `POST` | `/subgroups/slots` | Si | Crea bloque de agenda para subgrupos. |
| `PATCH` | `/subgroups/slots/:slotId` | Si | Actualiza bloque de agenda. |
| `DELETE` | `/subgroups/slots/:slotId` | Si | Elimina bloque de agenda. |
| `POST` | `/subgroups/slots/:slotId/groups` | Si | Crea subgrupo dentro de un bloque. |
| `PATCH` | `/subgroups/slots/:slotId/groups/:subgroupId` | Si | Actualiza subgrupo. |
| `DELETE` | `/subgroups/slots/:slotId/groups/:subgroupId` | Si | Elimina subgrupo. |
| `POST` | `/subgroups/slots/:slotId/join` | Si | Une al usuario a un subgrupo. |
| `POST` | `/subgroups/slots/:slotId/groups/:subgroupId/activities` | Si | Crea actividad de subgrupo. |
| `PATCH` | `/subgroups/slots/:slotId/activities/:activityId` | Si | Actualiza actividad de subgrupo. |
| `DELETE` | `/subgroups/slots/:slotId/activities/:activityId` | Si | Elimina actividad de subgrupo. |

## Chat

Base: `/api/groups/:groupId/chat`

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| `GET` | `/messages?limit=:limit` | Si | Lista mensajes del chat grupal. |
| `POST` | `/messages` | Si | Crea mensaje grupal y emite evento Socket.IO `chat_message`. |

Base de chat de subgrupo:

`/api/groups/:groupId/itinerary/subgroups/slots/:slotId/groups/:subgroupId/chat`

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| `GET` | `/messages?limit=:limit` | Si | Lista mensajes del chat de subgrupo. |
| `POST` | `/messages` | Si | Crea mensaje de subgrupo. |

## Enlaces contextuales

Base: `/api/groups/:groupId/context-links`

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| `GET` | `/` | Si | Lista relaciones contextuales. Acepta `entity_type` y `entity_id`. |
| `GET` | `/options` | Si | Lista opciones relacionables del grupo. |
| `POST` | `/` | Si | Crea relacion contextual. |
| `DELETE` | `/:linkId` | Si | Elimina relacion contextual. |

## Documentos

Bases preferidas:

- `/api/groups/:groupId/documents`
- `/api/groups/:groupId/vault`

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| `GET` | `/` | Si | Lista documentos del grupo. |
| `POST` | `/` | Si | Sube documento. Recibe `multipart/form-data` con campo `file`. |
| `DELETE` | `/:docId` | Si | Elimina documento. |

Alias directo:

Base: `/api/documents`

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| `GET` | `/:tripId` | Si | Lista documentos por `tripId`. |
| `POST` | `/:tripId` | Si | Sube documento por `tripId`. |
| `DELETE` | `/:tripId/:docId` | Si | Elimina documento por `tripId`. |

## Vuelos

Base: `/api/flights`

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| `GET` | `/airports/search` | Si | Busca aeropuertos por texto o coordenadas. |
| `GET` | `/airports/resolve` | Si | Resuelve aeropuerto cercano a destino. |
| `GET` | `/search` | Si | Busca vuelos. Requiere `origin`, `destination`, `departureDate`. |

## Hoteles

Base: `/api/hotels`

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| `POST` | `/search` | Si | Busca hospedajes por destino, fechas, huespedes y filtros. |
| `POST` | `/prebook` | Si | Crea prebook con `offerId`. |

## Mapas, lugares, rutas y clima

Base: `/api/maps`

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| `GET` | `/geocoding/search?address=:address` | Si | Geocodifica direccion. |
| `POST` | `/routes/compute` | Si | Calcula ruta entre origen y destino. |
| `GET` | `/places/autocomplete?input=:input` | Si | Autocompleta lugares. |
| `GET` | `/places/details/:placeId` | Si | Obtiene detalle de lugar. |
| `POST` | `/places/text-search` | Si | Busca lugares por texto. |
| `POST` | `/places/nearby` | Si | Busca lugares cercanos por tipos incluidos. |
| `GET` | `/weather?latitude=:lat&longitude=:lng` | Si | Obtiene clima por coordenadas. |

## Propuestas

Base: `/api/proposals`

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| `POST` | `/flights` | Si | Guarda propuesta de vuelo. |
| `POST` | `/hotels` | Si | Guarda propuesta de hospedaje. |
| `GET` | `/groups/:groupId` | Si | Lista propuestas de un grupo. |
| `GET` | `/:proposalId` | Si | Obtiene detalle de propuesta. |
| `PUT` | `/:proposalId` | Si | Actualiza propuesta. |
| `DELETE` | `/:proposalId` | Si | Elimina propuesta. |
| `POST` | `/groups/:tripId/:proposalId/vote` | Si | Registra voto con `a_favor`, `en_contra` o `abstencion`. |
| `POST` | `/groups/:tripId/:proposalId/admin-decision` | Si | Aplica decision administrativa: `aprobar` o `rechazar`. |
| `GET` | `/groups/:tripId/vote-results` | Si | Obtiene resultados de votacion del grupo. |
| `POST` | `/groups/:tripId/:proposalId/comments` | Si | Crea comentario en propuesta. |
| `GET` | `/groups/:tripId/:proposalId/comments` | Si | Lista comentarios de propuesta. |
| `PATCH` | `/groups/:tripId/:proposalId/comments/:commentId` | Si | Actualiza comentario. |
| `DELETE` | `/groups/:tripId/:proposalId/comments/:commentId` | Si | Elimina comentario. |

### Alias de votos y comentarios por propuesta

Base: `/api/proposals`

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| `POST` | `/:proposalId/votes` | Si | Registra voto simple. |
| `GET` | `/:proposalId/votes/summary` | Si | Obtiene resumen de votos. |
| `GET` | `/:proposalId/comments` | Si | Lista comentarios. |
| `POST` | `/:proposalId/comments` | Si | Crea comentario. |
| `PUT` | `/:proposalId/comments/:commentId` | Si | Actualiza comentario. |
| `DELETE` | `/:proposalId/comments/:commentId` | Si | Elimina comentario. |

## Presupuesto

Base preferida dentro de grupo: `/api/groups/:groupId`

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| `GET` | `/budget` | Si | Obtiene dashboard financiero. |
| `PATCH` | `/budget` | Si | Actualiza presupuesto total. |
| `GET` | `/expenses` | Si | Obtiene dashboard con gastos. |
| `POST` | `/expenses` | Si | Registra gasto. |
| `PUT` | `/expenses/:expenseId` | Si | Actualiza gasto. |
| `DELETE` | `/expenses/:expenseId` | Si | Elimina gasto. |
| `POST` | `/settlements/payments` | Si | Marca pago de liquidacion. |

Alias directo: `/api/budget`

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| `GET` | `/:groupId` | Si | Obtiene dashboard financiero. |
| `PATCH` | `/:groupId` | Si | Actualiza presupuesto total. |
| `GET` | `/:groupId/dashboard` | Si | Obtiene dashboard financiero. |
| `GET` | `/:groupId/expenses` | Si | Obtiene dashboard con gastos. |
| `POST` | `/:groupId/expenses` | Si | Registra gasto. |
| `PUT` | `/:groupId/expenses/:expenseId` | Si | Actualiza gasto. |
| `DELETE` | `/:groupId/expenses/:expenseId` | Si | Elimina gasto. |
| `POST` | `/:groupId/settlements/payments` | Si | Marca pago de liquidacion. |
| `GET` | `/:groupId/balances` | Si | Obtiene saldos por integrante. |
| `GET` | `/:groupId/settlements` | Si | Calcula liquidaciones minimas. |

## Notificaciones

Base: `/api/notifications`

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| `GET` | `/` | Si | Lista notificaciones del usuario. |
| `GET` | `/unread-count` | Si | Obtiene numero de no leidas. |
| `PATCH` | `/:id/read` | Si | Marca notificacion como leida. |
| `PATCH` | `/read-all` | Si | Marca todas como leidas. |
| `GET` | `/preferences` | Si | Obtiene preferencias de notificacion. |
| `PATCH` | `/preferences` | Si | Actualiza preferencias de notificacion. |

## Checkout simulado

Base: `/api/checkout`

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| `POST` | `/flight/:proposalId/pay` | Si | Simula compra de vuelo asociado a propuesta. |
| `POST` | `/hotel/:proposalId/reserve` | Si | Simula reserva de hospedaje asociado a propuesta. |

## Socket.IO

Socket.IO corre sobre el mismo servidor HTTP del backend.

Eventos observados en la implementacion:

| Evento | Direccion | Descripcion |
| --- | --- | --- |
| `chat_message` | servidor a sala | Mensaje nuevo en chat grupal. |
| Eventos de sockets de locks/propuestas | servidor a sala | Ver `backend/src/infrastructure/sockets`. |

Cuando se agregue o cambie un evento realtime, documentar:

- Nombre del evento.
- Payload.
- Quien lo emite.
- Quien lo consume en frontend.
- Flujo donde se usa.

## Reglas de mantenimiento

- Todo endpoint nuevo debe agregarse aqui antes de mergear.
- Si cambia un path, metodo HTTP, payload o respuesta, actualizar esta tabla.
- Si se elimina un endpoint, quitarlo o marcarlo como deprecado con fecha.
- Si se agrega un modulo nuevo, agregar su base path en "Bases montadas".
- Si el endpoint requiere archivo, indicar campo `multipart/form-data`.
