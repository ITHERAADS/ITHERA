# 📡 Ithera — Documentación de Endpoints REST API

> Este documento se actualiza conforme se implementan los módulos. Cada endpoint debe documentarse aquí antes de hacer merge a `develop`.

---

## Convenciones

- **Base URL:** `http://localhost:3000/api` (desarrollo)
- **Autenticación:** `Authorization: Bearer <JWT>` en todos los endpoints protegidos
- **Formato:** JSON en request y response
- **Códigos de éxito:** `200 OK`, `201 Created`
- **Códigos de error:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`

---

## M1 — Autenticación

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/auth/register` | ❌ | Paso 1: datos básicos (correo, contraseña, género) |
| POST | `/auth/verify-otp` | ❌ | Paso 2: verificar código OTP del correo |
| POST | `/auth/setup-profile` | ❌ | Paso 3: nickname y foto de perfil |
| POST | `/auth/login` | ❌ | Iniciar sesión, devuelve JWT |
| POST | `/auth/logout` | ✅ | Cerrar sesión, invalida token en Redis |
| POST | `/auth/forgot-password` | ❌ | Solicitar enlace de recuperación |
| POST | `/auth/reset-password` | ❌ | Restablecer contraseña con token |
| GET  | `/auth/me` | ✅ | Obtener datos del usuario autenticado |
| PUT  | `/auth/me` | ✅ | Editar perfil personal |
| PUT  | `/auth/me/password` | ✅ | Cambiar contraseña |
| DELETE | `/auth/me` | ✅ | Eliminar cuenta (requiere confirmación por correo) |

---

## M2 — Gestión de Grupo

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/trips` | ✅ | Listar viajes del usuario (activos e historial) |
| POST | `/trips` | ✅ | Crear nuevo viaje |
| GET | `/trips/:tripId` | ✅ | Ver detalles del viaje |
| POST | `/trips/join` | ✅ | Unirse a un viaje (código/QR/correo) |
| DELETE | `/trips/:tripId/leave` | ✅ | Abandonar viaje voluntariamente |
| POST | `/trips/:tripId/close` | ✅ Admin | Cerrar y archivar viaje |
| GET | `/trips/:tripId/members` | ✅ | Listar integrantes |
| DELETE | `/trips/:tripId/members/:userId` | ✅ Admin | Expulsar integrante |
| POST | `/trips/:tripId/invite` | ✅ Admin | Generar enlace/QR de invitación |
| POST | `/trips/:tripId/delegate` | ✅ Admin | Delegar rol de Admin |
| PATCH | `/trips/:tripId/modules` | ✅ Admin | Bloquear/desbloquear módulo (itinerary/budget) |

---

## M3 — Itinerario y Propuestas

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/trips/:tripId/itinerary` | ✅ | Ver itinerario general |
| POST | `/trips/:tripId/itinerary/transport` | ✅ | Añadir transporte |
| POST | `/trips/:tripId/itinerary/accommodation` | ✅ | Añadir alojamiento |
| POST | `/trips/:tripId/itinerary/activity` | ✅ | Añadir actividad grupal |
| GET | `/trips/:tripId/proposals` | ✅ | Listar propuestas (muro central) |
| POST | `/trips/:tripId/proposals` | ✅ | Crear propuesta grupal (Tipo B) |
| POST | `/trips/:tripId/proposals/:proposalId/vote` | ✅ | Votar propuesta |
| POST | `/trips/:tripId/proposals/:proposalId/lock` | ✅ Admin | Bloquear propuesta |
| POST | `/trips/:tripId/decisions` | ✅ Admin | Emitir Decisión Administrativa (Tipo A) |
| POST | `/trips/:tripId/subgroups` | ✅ Admin | Activar División en Subgrupos (Tipo C) |
| POST | `/trips/:tripId/subgroups/reunify` | ✅ Admin | Reunificar subgrupos |
| GET | `/trips/:tripId/itinerary/export` | ✅ | Exportar itinerario PDF/ICS |
| GET | `/trips/:tripId/vault` | ✅ | Listar bóveda de documentos |
| POST | `/trips/:tripId/vault` | ✅ | Subir documento a la bóveda |

---

## M4 — Búsqueda y APIs Externas

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/search/flights` | ✅ | Buscar vuelos (Amadeus) |
| GET | `/search/hotels` | ✅ | Buscar hospedaje (Amadeus) |
| GET | `/search/places` | ✅ | Buscar lugares (Google Places) |
| GET | `/search/routes` | ✅ | Calcular ruta (Google Routes) |

---

## M6 — Presupuesto y Gastos

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/trips/:tripId/budget` | ✅ | Ver dashboard financiero grupal |
| PATCH | `/trips/:tripId/budget` | ✅ Admin | Modificar presupuesto base |
| GET | `/trips/:tripId/expenses` | ✅ | Listar gastos del viaje |
| POST | `/trips/:tripId/expenses` | ✅ | Registrar nuevo gasto |
| PUT | `/trips/:tripId/expenses/:expenseId` | ✅ | Modificar gasto |
| DELETE | `/trips/:tripId/expenses/:expenseId` | ✅ | Eliminar gasto |
| GET | `/trips/:tripId/budget/balance` | ✅ | Calcular balance y liquidación mínima |
| GET | `/trips/:tripId/budget/wallet` | ✅ | Ver Mi Cartera (finanzas personales) |
| POST | `/trips/:tripId/budget/receipt` | ✅ | Generar recibo de cobro |
| PATCH | `/trips/:tripId/expenses/:expenseId/paid` | ✅ | Marcar pago como recibido |

---

## M7 — Notificaciones

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/notifications` | ✅ | Listar notificaciones del usuario |
| PATCH | `/notifications/:id/read` | ✅ | Marcar notificación como leída |
| PATCH | `/notifications/read-all` | ✅ | Marcar todas como leídas |
| GET | `/notifications/preferences` | ✅ | Ver preferencias de notificación |
| PUT | `/notifications/preferences` | ✅ | Actualizar preferencias |
| GET | `/trips/:tripId/search-history` | ✅ | Ver historial de búsquedas |
| GET | `/trips/:tripId/export` | ✅ | Exportar itinerario + resumen financiero PDF |

---

## Socket.io — Eventos en tiempo real

| Evento | Dirección | Descripción |
|--------|-----------|-------------|
| `join_trip` | cliente → servidor | Unirse a la sala del viaje |
| `leave_trip` | cliente → servidor | Salir de la sala del viaje |
| `heartbeat` | cliente → servidor | Pulso cada 30s (CU-5.2) |
| `heartbeat_ack` | servidor → cliente | Confirmación del pulso |
| `USER_ONLINE` | servidor → sala | Usuario se conectó |
| `USER_OFFLINE` | servidor → sala | Usuario se desconectó |
| `ITEM_LOCKED` | servidor → sala | Propuesta/actividad bloqueada (FCFS) |
| `PROPOSAL_UPDATED` | servidor → sala | Propuesta creada/modificada |
| `EXPENSE_UPDATED` | servidor → sala | Gasto registrado/modificado |
| `ROLE_CHANGED` | servidor → sala | Rol de un integrante cambió |
