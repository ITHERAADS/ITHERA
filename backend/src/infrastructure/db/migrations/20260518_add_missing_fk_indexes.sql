-- ============================================================
-- ITHERA - Índices en Foreign Keys sin índice
-- Fecha: 2026-05-18
-- Descripción: Agrega índices faltantes en columnas FK del
--   esquema public. Solo afecta rendimiento (no rompe nada).
--   Los índices de auth.* y storage.* son internos de Supabase
--   y NO se tocan.
-- ============================================================

-- itinerarios
CREATE INDEX IF NOT EXISTS idx_itinerarios_grupo_id   ON public.itinerarios(grupo_id);
CREATE INDEX IF NOT EXISTS idx_itinerarios_creado_por ON public.itinerarios(creado_por);

-- actividades
CREATE INDEX IF NOT EXISTS idx_actividades_itinerario_id ON public.actividades(itinerario_id);
CREATE INDEX IF NOT EXISTS idx_actividades_propuesta_id  ON public.actividades(propuesta_id);
CREATE INDEX IF NOT EXISTS idx_actividades_creado_por    ON public.actividades(creado_por);

-- transportes / alojamientos
CREATE INDEX IF NOT EXISTS idx_transportes_actividad_id ON public.transportes(actividad_id);
CREATE INDEX IF NOT EXISTS idx_alojamientos_actividad_id ON public.alojamientos(actividad_id);

-- grupo_invitaciones
CREATE INDEX IF NOT EXISTS idx_grupo_invitaciones_creada_por  ON public.grupo_invitaciones(creada_por);
CREATE INDEX IF NOT EXISTS idx_grupo_invitaciones_accepted_by ON public.grupo_invitaciones(accepted_by);

-- trip_documents
CREATE INDEX IF NOT EXISTS idx_trip_documents_user_id ON public.trip_documents(user_id);

-- budget / settlements
CREATE INDEX IF NOT EXISTS idx_group_subgroups_created_by      ON public.group_subgroups(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by_user_id        ON public.expenses(paid_by_user_id);
CREATE INDEX IF NOT EXISTS idx_settlement_payments_created_by  ON public.settlement_payments(created_by_user_id);

-- subgroups
CREATE INDEX IF NOT EXISTS idx_subgroup_slots_created_by       ON public.subgroup_slots(created_by);
CREATE INDEX IF NOT EXISTS idx_subgroups_created_by            ON public.subgroups(created_by);
CREATE INDEX IF NOT EXISTS idx_subgroup_memberships_assigned_by ON public.subgroup_memberships(assigned_by);
CREATE INDEX IF NOT EXISTS idx_subgroup_activities_created_by  ON public.subgroup_activities(created_by);
CREATE INDEX IF NOT EXISTS idx_subgroup_chat_mensajes_user_id  ON public.subgroup_chat_mensajes(usuario_id);

-- trip_context_links / solicitudes
CREATE INDEX IF NOT EXISTS idx_trip_context_links_created_by   ON public.trip_context_links(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_grupo_solicitudes_resuelta_por  ON public.grupo_solicitudes_union(resuelta_por);
