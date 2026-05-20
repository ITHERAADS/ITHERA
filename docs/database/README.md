# Base de datos y Supabase - ITHERA

Esta guia documenta la parte de datos del proyecto: Supabase, clientes del backend, migraciones y reglas para cambios de esquema.

## Tecnologia

- Supabase como backend de datos y autenticacion.
- Cliente anonimo para flujos de auth.
- Cliente service role para operaciones internas del backend.
- Migraciones SQL versionadas en el repositorio.

## Clientes backend

Archivo:

```text
backend/src/infrastructure/db/supabase.client.ts
```

| Cliente | Llave | Uso |
| --- | --- | --- |
| `supabaseAuth` | `SUPABASE_ANON_KEY` | Flujos normales de autenticacion. |
| `supabaseAdmin` | `SUPABASE_SECRET_KEY` | Operaciones privilegiadas desde backend. |
| `supabase` | Alias de `supabaseAdmin` | Compatibilidad con servicios existentes. |

## Migraciones

Ubicacion:

```text
backend/src/infrastructure/db/migrations/
```

Migraciones actuales:

| Archivo | Proposito |
| --- | --- |
| `001_trip_documents.sql` | Crea soporte inicial de documentos de viaje. |
| `002_trip_documents_metadata.sql` | Agrega metadata a documentos. |
| `20260419_unique_vote_per_user_proposal.sql` | Restringe voto unico por usuario/propuesta. |
| `20260421_add_lock_columns_propuestas.sql` | Agrega columnas de bloqueo a propuestas. |
| `20260428_create_group_chat_messages.sql` | Crea mensajes de chat grupal. |
| `20260429_add_vote_type_to_voto.sql` | Agrega tipo de voto. |
| `20260505_create_budget_tables.sql` | Crea tablas de presupuesto. |
| `20260505_add_settlement_payments.sql` | Agrega pagos de liquidaciones. |
| `20260506_create_subgroup_schedule.sql` | Crea agenda de subgrupos. |
| `20260506_enable_rls_policies.sql` | Habilita politicas RLS. |
| `20260506_optimize_realtime_notifications_indexes.sql` | Agrega indices para realtime/notificaciones. |
| `20260509_checkout_simulation.sql` | Agrega campos para checkout simulado. |
| `20260509_checkout_simulation_guardrails.sql` | Agrega guardrails de checkout. |
| `20260510_create_trip_context_links.sql` | Crea enlaces contextuales por viaje. |
| `20260510_issue_92_private_groups_join_requests.sql` | Agrega solicitudes para grupos privados. |
| `20260511_issue_94_group_text_length_guardrails.sql` | Agrega guardrails de longitud de texto. |
| `20260512_hotel_travel_context_indexes.sql` | Agrega indices para contexto de hotel/viaje. |
| `20260512_trigger_update_start_point_after_hotel_reservation.sql` | Actualiza punto de partida tras reserva hotelera. |

## Reglas para nuevas migraciones

- Usar prefijo de fecha `YYYYMMDD_descripcion.sql`.
- Hacer cambios idempotentes cuando sea razonable: `IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`.
- Incluir constraints cuando el dato tenga estados cerrados.
- Revisar impacto en RLS antes de cambiar tablas usadas por usuarios.
- Actualizar servicios backend y tipos frontend si cambia el contrato.
- Actualizar [../api/endpoints.md](../api/endpoints.md) si cambia un payload visible.

## RLS y seguridad

- Las politicas RLS deben evitar acceso cruzado entre grupos.
- El backend usa service role; por eso debe validar permisos antes de consultar o modificar datos sensibles.
- Los endpoints protegidos deben usar `requireAuth`.
- No exponer `SUPABASE_SECRET_KEY` al frontend.

## Checklist de cambio de esquema

1. Crear migracion SQL.
2. Revisar permisos/RLS.
3. Actualizar servicios de dominio.
4. Actualizar tests si la regla de negocio cambia.
5. Actualizar docs de API si cambia request/response.
6. Probar localmente el flujo afectado.
