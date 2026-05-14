# Realtime y Socket.IO - ITHERA

ITHERA usa Socket.IO para sincronizacion colaborativa, chat, presencia, locks y actualizaciones de dashboard.

## Archivos principales

Backend:

| Archivo | Uso |
| --- | --- |
| `backend/src/infrastructure/sockets/socket.server.ts` | Inicializa Socket.IO, CORS y autenticacion. |
| `backend/src/infrastructure/sockets/socket.handlers.ts` | Registra eventos recibidos desde cliente. |
| `backend/src/infrastructure/sockets/socket.gateway.ts` | Emisores usados por servicios backend. |
| `backend/src/infrastructure/sockets/lock.scheduler.ts` | Limpieza periodica de locks expirados. |

Frontend:

| Archivo | Uso |
| --- | --- |
| `frontend/src/hooks/useSocket.ts` | Crea socket compartido, reconexion y cola offline. |
| `frontend/src/hooks/useGroupRealtimeRefresh.ts` | Escucha eventos de grupo y refresca vistas. |

## Autenticacion

El cliente envia token Supabase en `handshake.auth.token`.

El backend:

1. Valida el token con Supabase Auth.
2. Busca el usuario local en tabla `usuarios`.
3. Inyecta en `socket.data`:
   - `authUserId`
   - `localUserId`
   - `userName`
   - `avatarUrl`

## Salas

| Sala | Uso |
| --- | --- |
| `user:<localUserId>` | Notificaciones personales. |
| `<groupId>` | Eventos de grupo/viaje. |
| `subgroup:<subgroupId>` | Chat de subgrupo. |

## Eventos cliente -> servidor

| Evento | Payload minimo | Descripcion |
| --- | --- | --- |
| `join_room` | `{ tripId }` | Une al usuario a sala de grupo y actualiza presencia. |
| `leave_room` | `{ tripId }` | Saca al usuario de sala de grupo. |
| `chat_send_message` | `{ groupId, contenido, clientId? }` | Crea y emite mensaje grupal. |
| `item_lock` | `{ tripId, propuestaId }` | Intenta bloquear propuesta para edicion. |
| `item_unlock` | `{ tripId, propuestaId }` | Libera bloqueo de propuesta. |
| `join_subgroup_room` | `{ subgroupId }` | Une al usuario a sala de subgrupo. |
| `leave_subgroup_room` | `{ subgroupId }` | Sale de sala de subgrupo. |
| `subgroup_chat_send_message` | `{ subgroupId, contenido, clientId? }` | Crea y emite mensaje de subgrupo. |

## Eventos servidor -> cliente

| Evento | Uso |
| --- | --- |
| `room_joined` | Confirma union a sala de grupo. |
| `presence_update` | Lista usuarios online por grupo. |
| `user_joined` | Usuario entro a sala. |
| `user_left` | Usuario salio de sala. |
| `chat_message` | Mensaje nuevo de chat grupal. |
| `lock_acquired` | Lock obtenido por el cliente solicitante. |
| `lock_error` | Error al bloquear propuesta. |
| `item_locked` | Propuesta bloqueada por otro usuario. |
| `unlock_confirmed` | Unlock confirmado al solicitante. |
| `item_unlocked` | Propuesta desbloqueada. |
| `dashboard_updated` | Refresco de dashboard/grupo. |
| `vote_updated` | Votos de propuestas actualizados. |
| `checkout_updated` | Estado de checkout actualizado. |
| `subgroup_room_joined` | Confirma union a sala de subgrupo. |
| `subgroup_chat_message` | Mensaje nuevo de subgrupo. |
| `error_event` | Error generico de socket. |

## Locks

- Los locks protegen propuestas durante edicion.
- Se validan membresia y pertenencia de propuesta al grupo.
- Al desconectarse un usuario, se liberan sus locks.
- `lock.scheduler.ts` limpia locks expirados cada 60 segundos.
- TTL: `LOCK_TTL_MINUTES`.

## Checklist al agregar un evento

1. Documentar evento en esta guia.
2. Definir payload minimo.
3. Validar permisos/membresia.
4. Actualizar hooks frontend consumidores.
5. Agregar prueba o verificacion manual.
6. Actualizar [../api/endpoints.md](../api/endpoints.md) si el evento complementa un endpoint.
