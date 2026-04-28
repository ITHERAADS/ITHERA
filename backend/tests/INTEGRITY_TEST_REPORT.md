# Reporte de pruebas de integridad (Backend)

**Proyecto:** ITHERA backend  
**Fecha:** 2026-04-19 / 2026-04-20  
**Alcance:** Módulo de propuestas (votos, resultados, comentarios, seguridad por grupo)

---

## 1) Objetivo de las pruebas

Validar que la implementación backend cumple con:

1. Voto único por `UserID` + `PropuestaID`.
2. Endpoint de resultados ordenados por popularidad.
3. CRUD de comentarios.
4. Seguridad: solo miembros del viaje/grupo pueden votar o comentar.
5. Compilación y estabilidad del módulo tras cambios.

---

## 2) Tareas realizadas

| Tarea | Propósito | Resultado |
|---|---|---|
| Compilación TypeScript | Verificar integridad de tipos y build del backend | ✅ Exitosa |
| Pruebas unitarias (`jest`) | Validar reglas de negocio en servicio de propuestas | ✅ 5/5 pruebas |
| Pruebas E2E autenticadas | Verificar comportamiento real de endpoints con Supabase | ✅ Flujo principal validado |
| Validación de entorno (`.env`) | Confirmar carga correcta de variables (Supabase y APIs) | ✅ Correcto |
| Diagnóstico y corrección de bug | Resolver falso 403 en edición/eliminación de comentarios propios | ✅ Corregido |

---

## 3) Evidencia de pruebas (input/output)

## 3.1 Compilación

**Input (comando):**

```bash
npm run build
```

**Output:**

```text
> ithera-backend@1.0.0 build
> tsc
```

**Resultado:** ✅ Compila sin errores.

---

## 3.2 Pruebas unitarias (Jest)

**Input (comando):**

```bash
npm test -- --runInBand
```

**Output (resumen):**

```text
PASS  tests/proposals.service.test.ts
  ProposalsService integrity tests
    ✓ castSingleVote: registra voto cuando no existe voto previo
    ✓ castSingleVote: rechaza segundo voto del mismo usuario en la misma propuesta
    ✓ getProposalVoteResults: devuelve propuestas ordenadas por popularidad
    ✓ createComment: valida seguridad de grupo (rechaza usuario fuera del grupo)
    ✓ updateComment: impide editar comentarios de otro usuario

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
```

**Resultado:** ✅ Todas las pruebas pasan.

---

## 3.3 Pruebas E2E (flujo real con auth + DB)

> Se usó usuario temporal de prueba, JWT real de sesión y datos creados durante la corrida.

### a) Registro y login

**Input (resumen):**

- `POST /api/auth/test-signup`
- `POST /api/auth/test-login`
- `POST /api/auth/sync-user`
- `GET /api/auth/me`

**Output (resumen):**

- `signup: 201`
- `login: 200`
- `sync-user: 200`
- `me: 200`

**Resultado:** ✅ Autenticación y sincronización local correctas.

### b) Crear grupo + propuesta de prueba

**Input (resumen):**

- `POST /api/groups`
- Inserción de propuesta de prueba en `propuestas` (REST de Supabase)

**Output (resumen):**

- `create-group: 201`
- `insert-proposal: 201`

**Resultado:** ✅ Datos base para pruebas de propuestas disponibles.

### c) Voto único

**Input:**

- `POST /api/groups/:tripId/proposals/:proposalId/vote` (primer intento)
- Mismo endpoint (segundo intento, mismo usuario/propuesta)

**Output:**

- `vote-1: 200` (voto registrado)
- `vote-2: 409` (ya emitiste tu voto)

**Resultado:** ✅ Regla de voto único funcionando.

### d) Comentarios (CRUD)

**Input:**

- `POST /api/groups/:tripId/proposals/:proposalId/comments`
- `GET /api/groups/:tripId/proposals/:proposalId/comments`
- `PATCH /api/groups/:tripId/proposals/:proposalId/comments/:commentId`
- `DELETE /api/groups/:tripId/proposals/:proposalId/comments/:commentId`

**Output final:**

- `create: 201`
- `list: 200`
- `patch: 200`
- `delete: 200`

**Resultado:** ✅ CRUD de comentarios funcionando para autor.

### e) Resultados por popularidad

**Input:**

- `GET /api/groups/:tripId/proposals/vote-results`

**Output:**

- `200` con lista `results` ordenada por `votos desc`.

**Resultado:** ✅ Endpoint de resultados funcionando.

---

## 4) Incidencias detectadas y corrección

### Incidencia

- Edición/eliminación de comentarios propios devolvía `403` (falso positivo).
- Causa: comparación de `id_usuario` con tipos distintos (`number` vs `string`).

### Corrección aplicada

- Normalización de IDs a `String(...)` antes de comparar.
- Ajuste en retorno de `getLocalUserId` para consistencia.

### Resultado post-fix

- `PATCH` y `DELETE` de comentarios del autor: `200`.
- Build y tests: ✅.

---

## 5) Archivos involucrados

- `src/domain/proposals/proposals.service.ts`
- `src/routes/proposals.router.ts`
- `src/domain/groups/groups.service.ts`
- `src/config/env.ts`
- `tests/proposals.service.test.ts`
- `src/infrastructure/db/migrations/20260419_unique_vote_per_user_proposal.sql`

---

## 6) Conclusión

La implementación del backend para interacción social sobre propuestas quedó validada en:

- compilación,
- pruebas unitarias,
- y pruebas E2E reales.

Se verificó voto único, resultados de popularidad, CRUD de comentarios y controles de acceso por pertenencia al grupo.
