-- ITHERA - RLS baseline policies
-- Ejecutar en Supabase SQL Editor.
-- Objetivo: cerrar tablas públicas y permitir acceso solo al usuario autenticado según membresía de grupo.

BEGIN;

-- =========================================================
-- 1) Helper functions
-- =========================================================

CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT u.id_usuario
  FROM public.usuarios u
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.grupo_miembros gm
    JOIN public.usuarios u ON u.id_usuario = gm.usuario_id
    WHERE gm.grupo_id = p_group_id
      AND u.auth_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.grupo_miembros gm
    JOIN public.usuarios u ON u.id_usuario = gm.usuario_id
    WHERE gm.grupo_id = p_group_id
      AND u.auth_user_id = auth.uid()
      AND gm.rol = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_creator(p_group_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.grupos_viaje g
    JOIN public.usuarios u ON u.id_usuario = g.creado_por
    WHERE g.id = p_group_id
      AND u.auth_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.proposal_group_id(p_propuesta_id bigint)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.grupo_id
  FROM public.propuestas p
  WHERE p.id_propuesta = p_propuesta_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_proposal(p_propuesta_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.propuestas p
    JOIN public.usuarios u ON u.id_usuario = p.creado_por
    WHERE p.id_propuesta = p_propuesta_id
      AND u.auth_user_id = auth.uid()
  ) OR public.is_group_admin(public.proposal_group_id(p_propuesta_id));
$$;

CREATE OR REPLACE FUNCTION public.itinerary_group_id(p_itinerary_id bigint)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.grupo_id
  FROM public.itinerarios i
  WHERE i.id_itinerario = p_itinerary_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.activity_group_id(p_activity_id bigint)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.grupo_id
  FROM public.actividades a
  JOIN public.itinerarios i ON i.id_itinerario = a.itinerario_id
  WHERE a.id_actividad = p_activity_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.slot_group_id(p_slot_id bigint)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.group_id
  FROM public.subgroup_slots s
  WHERE s.id = p_slot_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.subgroup_group_id(p_subgroup_id bigint)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ss.group_id
  FROM public.subgroups sg
  JOIN public.subgroup_slots ss ON ss.id = sg.slot_id
  WHERE sg.id = p_subgroup_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.group_subgroup_group_id(p_group_subgroup_id bigint)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gs.group_id
  FROM public.group_subgroups gs
  WHERE gs.id = p_group_subgroup_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.expense_group_id(p_expense_id bigint)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.group_id
  FROM public.expenses e
  WHERE e.id = p_expense_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.settlement_group_id(p_settlement_id bigint)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sp.group_id
  FROM public.settlement_payments sp
  WHERE sp.id = p_settlement_id
  LIMIT 1;
$$;

-- =========================================================
-- 2) Enable RLS
-- =========================================================

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupos_viaje ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupo_miembros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupo_invitaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_preferencias_notificacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.propuestas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vuelos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospedajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transportes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alojamientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_document_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_payment_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_subgroups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_subgroup_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subgroup_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subgroups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subgroup_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subgroup_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subgroup_chat_mensajes ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 3) Policies
-- =========================================================

-- usuarios
DROP POLICY IF EXISTS usuarios_select_self ON public.usuarios;
CREATE POLICY usuarios_select_self ON public.usuarios
FOR SELECT TO authenticated
USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS usuarios_insert_self ON public.usuarios;
CREATE POLICY usuarios_insert_self ON public.usuarios
FOR INSERT TO authenticated
WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS usuarios_update_self ON public.usuarios;
CREATE POLICY usuarios_update_self ON public.usuarios
FOR UPDATE TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- grupos_viaje
DROP POLICY IF EXISTS grupos_viaje_select_member ON public.grupos_viaje;
CREATE POLICY grupos_viaje_select_member ON public.grupos_viaje
FOR SELECT TO authenticated
USING (public.is_group_member(id) OR public.is_group_creator(id));

DROP POLICY IF EXISTS grupos_viaje_insert_creator ON public.grupos_viaje;
CREATE POLICY grupos_viaje_insert_creator ON public.grupos_viaje
FOR INSERT TO authenticated
WITH CHECK (creado_por = public.current_app_user_id());

DROP POLICY IF EXISTS grupos_viaje_update_admin ON public.grupos_viaje;
CREATE POLICY grupos_viaje_update_admin ON public.grupos_viaje
FOR UPDATE TO authenticated
USING (public.is_group_admin(id) OR public.is_group_creator(id))
WITH CHECK (public.is_group_admin(id) OR public.is_group_creator(id));

DROP POLICY IF EXISTS grupos_viaje_delete_admin ON public.grupos_viaje;
CREATE POLICY grupos_viaje_delete_admin ON public.grupos_viaje
FOR DELETE TO authenticated
USING (public.is_group_admin(id) OR public.is_group_creator(id));

-- grupo_miembros
DROP POLICY IF EXISTS grupo_miembros_select_group_member ON public.grupo_miembros;
CREATE POLICY grupo_miembros_select_group_member ON public.grupo_miembros
FOR SELECT TO authenticated
USING (public.is_group_member(grupo_id) OR usuario_id = public.current_app_user_id());

DROP POLICY IF EXISTS grupo_miembros_insert_admin_or_self ON public.grupo_miembros;
CREATE POLICY grupo_miembros_insert_admin_or_self ON public.grupo_miembros
FOR INSERT TO authenticated
WITH CHECK (public.is_group_admin(grupo_id) OR usuario_id = public.current_app_user_id());

DROP POLICY IF EXISTS grupo_miembros_update_admin ON public.grupo_miembros;
CREATE POLICY grupo_miembros_update_admin ON public.grupo_miembros
FOR UPDATE TO authenticated
USING (public.is_group_admin(grupo_id))
WITH CHECK (public.is_group_admin(grupo_id));

DROP POLICY IF EXISTS grupo_miembros_delete_admin_or_self ON public.grupo_miembros;
CREATE POLICY grupo_miembros_delete_admin_or_self ON public.grupo_miembros
FOR DELETE TO authenticated
USING (public.is_group_admin(grupo_id) OR usuario_id = public.current_app_user_id());

-- invitaciones
DROP POLICY IF EXISTS grupo_invitaciones_select_admin_or_creator ON public.grupo_invitaciones;
CREATE POLICY grupo_invitaciones_select_admin_or_creator ON public.grupo_invitaciones
FOR SELECT TO authenticated
USING (public.is_group_admin(grupo_id) OR creada_por = public.current_app_user_id() OR accepted_by = public.current_app_user_id());

DROP POLICY IF EXISTS grupo_invitaciones_manage_admin ON public.grupo_invitaciones;
CREATE POLICY grupo_invitaciones_manage_admin ON public.grupo_invitaciones
FOR ALL TO authenticated
USING (public.is_group_admin(grupo_id) OR creada_por = public.current_app_user_id() OR accepted_by = public.current_app_user_id())
WITH CHECK (public.is_group_admin(grupo_id) OR creada_por = public.current_app_user_id() OR accepted_by = public.current_app_user_id());

-- notificaciones
DROP POLICY IF EXISTS notificaciones_select_own ON public.notificaciones;
CREATE POLICY notificaciones_select_own ON public.notificaciones
FOR SELECT TO authenticated
USING (usuario_id = public.current_app_user_id());

DROP POLICY IF EXISTS notificaciones_insert_own ON public.notificaciones;
CREATE POLICY notificaciones_insert_own ON public.notificaciones
FOR INSERT TO authenticated
WITH CHECK (usuario_id = public.current_app_user_id());

DROP POLICY IF EXISTS notificaciones_update_own ON public.notificaciones;
CREATE POLICY notificaciones_update_own ON public.notificaciones
FOR UPDATE TO authenticated
USING (usuario_id = public.current_app_user_id())
WITH CHECK (usuario_id = public.current_app_user_id());

DROP POLICY IF EXISTS notificaciones_delete_own ON public.notificaciones;
CREATE POLICY notificaciones_delete_own ON public.notificaciones
FOR DELETE TO authenticated
USING (usuario_id = public.current_app_user_id());

-- preferencias
DROP POLICY IF EXISTS preferencias_own ON public.usuario_preferencias_notificacion;
CREATE POLICY preferencias_own ON public.usuario_preferencias_notificacion
FOR ALL TO authenticated
USING (usuario_id = public.current_app_user_id())
WITH CHECK (usuario_id = public.current_app_user_id());

-- propuestas
DROP POLICY IF EXISTS propuestas_select_group_member ON public.propuestas;
CREATE POLICY propuestas_select_group_member ON public.propuestas
FOR SELECT TO authenticated
USING (public.is_group_member(grupo_id));

DROP POLICY IF EXISTS propuestas_insert_group_member ON public.propuestas;
CREATE POLICY propuestas_insert_group_member ON public.propuestas
FOR INSERT TO authenticated
WITH CHECK (public.is_group_member(grupo_id) AND creado_por = public.current_app_user_id());

DROP POLICY IF EXISTS propuestas_update_creator_or_admin ON public.propuestas;
CREATE POLICY propuestas_update_creator_or_admin ON public.propuestas
FOR UPDATE TO authenticated
USING (creado_por = public.current_app_user_id() OR public.is_group_admin(grupo_id))
WITH CHECK (creado_por = public.current_app_user_id() OR public.is_group_admin(grupo_id));

DROP POLICY IF EXISTS propuestas_delete_creator_or_admin ON public.propuestas;
CREATE POLICY propuestas_delete_creator_or_admin ON public.propuestas
FOR DELETE TO authenticated
USING (creado_por = public.current_app_user_id() OR public.is_group_admin(grupo_id));

-- vuelos / hospedajes ligados a propuestas
DROP POLICY IF EXISTS vuelos_select_group_member ON public.vuelos;
CREATE POLICY vuelos_select_group_member ON public.vuelos
FOR SELECT TO authenticated
USING (public.is_group_member(public.proposal_group_id(propuesta_id)));
DROP POLICY IF EXISTS vuelos_manage_proposal_owner_or_admin ON public.vuelos;
CREATE POLICY vuelos_manage_proposal_owner_or_admin ON public.vuelos
FOR ALL TO authenticated
USING (public.can_manage_proposal(propuesta_id))
WITH CHECK (public.can_manage_proposal(propuesta_id));

DROP POLICY IF EXISTS hospedajes_select_group_member ON public.hospedajes;
CREATE POLICY hospedajes_select_group_member ON public.hospedajes
FOR SELECT TO authenticated
USING (public.is_group_member(public.proposal_group_id(propuesta_id)));
DROP POLICY IF EXISTS hospedajes_manage_proposal_owner_or_admin ON public.hospedajes;
CREATE POLICY hospedajes_manage_proposal_owner_or_admin ON public.hospedajes
FOR ALL TO authenticated
USING (public.can_manage_proposal(propuesta_id))
WITH CHECK (public.can_manage_proposal(propuesta_id));

-- votos y comentarios
DROP POLICY IF EXISTS voto_select_group_member ON public.voto;
CREATE POLICY voto_select_group_member ON public.voto
FOR SELECT TO authenticated
USING (public.is_group_member(public.proposal_group_id(id_propuesta)));
DROP POLICY IF EXISTS voto_insert_member_self ON public.voto;
CREATE POLICY voto_insert_member_self ON public.voto
FOR INSERT TO authenticated
WITH CHECK (id_usuario = public.current_app_user_id() AND public.is_group_member(public.proposal_group_id(id_propuesta)));
DROP POLICY IF EXISTS voto_update_self ON public.voto;
CREATE POLICY voto_update_self ON public.voto
FOR UPDATE TO authenticated
USING (id_usuario = public.current_app_user_id())
WITH CHECK (id_usuario = public.current_app_user_id());
DROP POLICY IF EXISTS voto_delete_self_or_admin ON public.voto;
CREATE POLICY voto_delete_self_or_admin ON public.voto
FOR DELETE TO authenticated
USING (id_usuario = public.current_app_user_id() OR public.is_group_admin(public.proposal_group_id(id_propuesta)));

DROP POLICY IF EXISTS comentario_select_group_member ON public.comentario;
CREATE POLICY comentario_select_group_member ON public.comentario
FOR SELECT TO authenticated
USING (public.is_group_member(public.proposal_group_id(id_propuesta)));
DROP POLICY IF EXISTS comentario_insert_member_self ON public.comentario;
CREATE POLICY comentario_insert_member_self ON public.comentario
FOR INSERT TO authenticated
WITH CHECK (id_usuario = public.current_app_user_id() AND public.is_group_member(public.proposal_group_id(id_propuesta)));
DROP POLICY IF EXISTS comentario_update_self ON public.comentario;
CREATE POLICY comentario_update_self ON public.comentario
FOR UPDATE TO authenticated
USING (id_usuario = public.current_app_user_id())
WITH CHECK (id_usuario = public.current_app_user_id());
DROP POLICY IF EXISTS comentario_delete_self_or_admin ON public.comentario;
CREATE POLICY comentario_delete_self_or_admin ON public.comentario
FOR DELETE TO authenticated
USING (id_usuario = public.current_app_user_id() OR public.is_group_admin(public.proposal_group_id(id_propuesta)));

-- itinerario / actividades
DROP POLICY IF EXISTS itinerarios_select_group_member ON public.itinerarios;
CREATE POLICY itinerarios_select_group_member ON public.itinerarios
FOR SELECT TO authenticated
USING (public.is_group_member(grupo_id));
DROP POLICY IF EXISTS itinerarios_manage_admin_or_creator ON public.itinerarios;
CREATE POLICY itinerarios_manage_admin_or_creator ON public.itinerarios
FOR ALL TO authenticated
USING (public.is_group_admin(grupo_id) OR creado_por = public.current_app_user_id())
WITH CHECK (public.is_group_admin(grupo_id) OR creado_por = public.current_app_user_id());

DROP POLICY IF EXISTS actividades_select_group_member ON public.actividades;
CREATE POLICY actividades_select_group_member ON public.actividades
FOR SELECT TO authenticated
USING (public.is_group_member(public.itinerary_group_id(itinerario_id)));
DROP POLICY IF EXISTS actividades_manage_creator_or_admin ON public.actividades;
CREATE POLICY actividades_manage_creator_or_admin ON public.actividades
FOR ALL TO authenticated
USING (creado_por = public.current_app_user_id() OR public.is_group_admin(public.itinerary_group_id(itinerario_id)))
WITH CHECK (creado_por = public.current_app_user_id() OR public.is_group_admin(public.itinerary_group_id(itinerario_id)));

DROP POLICY IF EXISTS transportes_select_group_member ON public.transportes;
CREATE POLICY transportes_select_group_member ON public.transportes
FOR SELECT TO authenticated
USING (public.is_group_member(public.activity_group_id(actividad_id)));
DROP POLICY IF EXISTS transportes_manage_group_admin ON public.transportes;
CREATE POLICY transportes_manage_group_admin ON public.transportes
FOR ALL TO authenticated
USING (public.is_group_admin(public.activity_group_id(actividad_id)))
WITH CHECK (public.is_group_admin(public.activity_group_id(actividad_id)));

DROP POLICY IF EXISTS alojamientos_select_group_member ON public.alojamientos;
CREATE POLICY alojamientos_select_group_member ON public.alojamientos
FOR SELECT TO authenticated
USING (public.is_group_member(public.activity_group_id(actividad_id)));
DROP POLICY IF EXISTS alojamientos_manage_group_admin ON public.alojamientos;
CREATE POLICY alojamientos_manage_group_admin ON public.alojamientos
FOR ALL TO authenticated
USING (public.is_group_admin(public.activity_group_id(actividad_id)))
WITH CHECK (public.is_group_admin(public.activity_group_id(actividad_id)));

-- chat
DROP POLICY IF EXISTS chat_mensajes_select_group_member ON public.chat_mensajes;
CREATE POLICY chat_mensajes_select_group_member ON public.chat_mensajes
FOR SELECT TO authenticated
USING (public.is_group_member(grupo_id));
DROP POLICY IF EXISTS chat_mensajes_insert_group_member_self ON public.chat_mensajes;
CREATE POLICY chat_mensajes_insert_group_member_self ON public.chat_mensajes
FOR INSERT TO authenticated
WITH CHECK (usuario_id = public.current_app_user_id() AND public.is_group_member(grupo_id));
DROP POLICY IF EXISTS chat_mensajes_delete_self_or_admin ON public.chat_mensajes;
CREATE POLICY chat_mensajes_delete_self_or_admin ON public.chat_mensajes
FOR DELETE TO authenticated
USING (usuario_id = public.current_app_user_id() OR public.is_group_admin(grupo_id));

-- documentos
DROP POLICY IF EXISTS trip_documents_select_member ON public.trip_documents;
CREATE POLICY trip_documents_select_member ON public.trip_documents
FOR SELECT TO authenticated
USING (public.is_group_member(trip_id) OR user_id = auth.uid());
DROP POLICY IF EXISTS trip_documents_insert_member_self ON public.trip_documents;
CREATE POLICY trip_documents_insert_member_self ON public.trip_documents
FOR INSERT TO authenticated
WITH CHECK (public.is_group_member(trip_id) AND user_id = auth.uid());
DROP POLICY IF EXISTS trip_documents_update_owner_or_admin ON public.trip_documents;
CREATE POLICY trip_documents_update_owner_or_admin ON public.trip_documents
FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_group_admin(trip_id))
WITH CHECK (user_id = auth.uid() OR public.is_group_admin(trip_id));
DROP POLICY IF EXISTS trip_documents_delete_owner_or_admin ON public.trip_documents;
CREATE POLICY trip_documents_delete_owner_or_admin ON public.trip_documents
FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.is_group_admin(trip_id));

DROP POLICY IF EXISTS trip_document_people_select_member ON public.trip_document_people;
CREATE POLICY trip_document_people_select_member ON public.trip_document_people
FOR SELECT TO authenticated
USING (usuario_id = public.current_app_user_id() OR EXISTS (SELECT 1 FROM public.trip_documents td WHERE td.id = trip_document_id AND public.is_group_member(td.trip_id)));
DROP POLICY IF EXISTS trip_document_people_manage_self ON public.trip_document_people;
CREATE POLICY trip_document_people_manage_self ON public.trip_document_people
FOR ALL TO authenticated
USING (usuario_id = public.current_app_user_id())
WITH CHECK (usuario_id = public.current_app_user_id());

-- presupuesto
DROP POLICY IF EXISTS expenses_select_group_member ON public.expenses;
CREATE POLICY expenses_select_group_member ON public.expenses
FOR SELECT TO authenticated
USING (public.is_group_member(group_id));
DROP POLICY IF EXISTS expenses_manage_group_member ON public.expenses;
CREATE POLICY expenses_manage_group_member ON public.expenses
FOR ALL TO authenticated
USING (public.is_group_member(group_id))
WITH CHECK (public.is_group_member(group_id) AND paid_by_user_id = public.current_app_user_id());

DROP POLICY IF EXISTS expense_splits_select_group_member ON public.expense_splits;
CREATE POLICY expense_splits_select_group_member ON public.expense_splits
FOR SELECT TO authenticated
USING (public.is_group_member(public.expense_group_id(expense_id)));
DROP POLICY IF EXISTS expense_splits_manage_group_member ON public.expense_splits;
CREATE POLICY expense_splits_manage_group_member ON public.expense_splits
FOR ALL TO authenticated
USING (public.is_group_member(public.expense_group_id(expense_id)))
WITH CHECK (public.is_group_member(public.expense_group_id(expense_id)));

DROP POLICY IF EXISTS expense_documents_select_group_member ON public.expense_documents;
CREATE POLICY expense_documents_select_group_member ON public.expense_documents
FOR SELECT TO authenticated
USING (public.is_group_member(public.expense_group_id(expense_id)));
DROP POLICY IF EXISTS expense_documents_manage_group_member ON public.expense_documents;
CREATE POLICY expense_documents_manage_group_member ON public.expense_documents
FOR ALL TO authenticated
USING (public.is_group_member(public.expense_group_id(expense_id)))
WITH CHECK (public.is_group_member(public.expense_group_id(expense_id)));

DROP POLICY IF EXISTS settlement_payments_select_group_member ON public.settlement_payments;
CREATE POLICY settlement_payments_select_group_member ON public.settlement_payments
FOR SELECT TO authenticated
USING (public.is_group_member(group_id));
DROP POLICY IF EXISTS settlement_payments_manage_group_member ON public.settlement_payments;
CREATE POLICY settlement_payments_manage_group_member ON public.settlement_payments
FOR ALL TO authenticated
USING (public.is_group_member(group_id))
WITH CHECK (public.is_group_member(group_id) AND created_by_user_id = public.current_app_user_id());

DROP POLICY IF EXISTS settlement_payment_documents_select_group_member ON public.settlement_payment_documents;
CREATE POLICY settlement_payment_documents_select_group_member ON public.settlement_payment_documents
FOR SELECT TO authenticated
USING (public.is_group_member(public.settlement_group_id(settlement_payment_id)));
DROP POLICY IF EXISTS settlement_payment_documents_manage_group_member ON public.settlement_payment_documents;
CREATE POLICY settlement_payment_documents_manage_group_member ON public.settlement_payment_documents
FOR ALL TO authenticated
USING (public.is_group_member(public.settlement_group_id(settlement_payment_id)))
WITH CHECK (public.is_group_member(public.settlement_group_id(settlement_payment_id)));

-- group_subgroups
DROP POLICY IF EXISTS group_subgroups_select_group_member ON public.group_subgroups;
CREATE POLICY group_subgroups_select_group_member ON public.group_subgroups
FOR SELECT TO authenticated
USING (public.is_group_member(group_id));
DROP POLICY IF EXISTS group_subgroups_manage_creator_or_admin ON public.group_subgroups;
CREATE POLICY group_subgroups_manage_creator_or_admin ON public.group_subgroups
FOR ALL TO authenticated
USING (created_by_user_id = public.current_app_user_id() OR public.is_group_admin(group_id))
WITH CHECK (created_by_user_id = public.current_app_user_id() OR public.is_group_admin(group_id));

DROP POLICY IF EXISTS group_subgroup_members_select_group_member ON public.group_subgroup_members;
CREATE POLICY group_subgroup_members_select_group_member ON public.group_subgroup_members
FOR SELECT TO authenticated
USING (public.is_group_member(public.group_subgroup_group_id(subgroup_id)));
DROP POLICY IF EXISTS group_subgroup_members_manage_admin_or_self ON public.group_subgroup_members;
CREATE POLICY group_subgroup_members_manage_admin_or_self ON public.group_subgroup_members
FOR ALL TO authenticated
USING (user_id = public.current_app_user_id() OR public.is_group_admin(public.group_subgroup_group_id(subgroup_id)))
WITH CHECK (user_id = public.current_app_user_id() OR public.is_group_admin(public.group_subgroup_group_id(subgroup_id)));

-- subgroups schedule
DROP POLICY IF EXISTS subgroup_slots_select_group_member ON public.subgroup_slots;
CREATE POLICY subgroup_slots_select_group_member ON public.subgroup_slots
FOR SELECT TO authenticated
USING (public.is_group_member(group_id));
DROP POLICY IF EXISTS subgroup_slots_manage_creator_or_admin ON public.subgroup_slots;
CREATE POLICY subgroup_slots_manage_creator_or_admin ON public.subgroup_slots
FOR ALL TO authenticated
USING (created_by = public.current_app_user_id() OR public.is_group_admin(group_id))
WITH CHECK (created_by = public.current_app_user_id() OR public.is_group_admin(group_id));

DROP POLICY IF EXISTS subgroups_select_group_member ON public.subgroups;
CREATE POLICY subgroups_select_group_member ON public.subgroups
FOR SELECT TO authenticated
USING (public.is_group_member(public.slot_group_id(slot_id)));
DROP POLICY IF EXISTS subgroups_manage_creator_or_admin ON public.subgroups;
CREATE POLICY subgroups_manage_creator_or_admin ON public.subgroups
FOR ALL TO authenticated
USING (created_by = public.current_app_user_id() OR public.is_group_admin(public.slot_group_id(slot_id)))
WITH CHECK (created_by = public.current_app_user_id() OR public.is_group_admin(public.slot_group_id(slot_id)));

DROP POLICY IF EXISTS subgroup_memberships_select_group_member ON public.subgroup_memberships;
CREATE POLICY subgroup_memberships_select_group_member ON public.subgroup_memberships
FOR SELECT TO authenticated
USING (public.is_group_member(public.slot_group_id(slot_id)));
DROP POLICY IF EXISTS subgroup_memberships_manage_admin_or_self ON public.subgroup_memberships;
CREATE POLICY subgroup_memberships_manage_admin_or_self ON public.subgroup_memberships
FOR ALL TO authenticated
USING (user_id = public.current_app_user_id() OR assigned_by = public.current_app_user_id() OR public.is_group_admin(public.slot_group_id(slot_id)))
WITH CHECK (user_id = public.current_app_user_id() OR assigned_by = public.current_app_user_id() OR public.is_group_admin(public.slot_group_id(slot_id)));

DROP POLICY IF EXISTS subgroup_activities_select_group_member ON public.subgroup_activities;
CREATE POLICY subgroup_activities_select_group_member ON public.subgroup_activities
FOR SELECT TO authenticated
USING (public.is_group_member(public.slot_group_id(slot_id)));
DROP POLICY IF EXISTS subgroup_activities_manage_creator_or_admin ON public.subgroup_activities;
CREATE POLICY subgroup_activities_manage_creator_or_admin ON public.subgroup_activities
FOR ALL TO authenticated
USING (created_by = public.current_app_user_id() OR public.is_group_admin(public.slot_group_id(slot_id)))
WITH CHECK (created_by = public.current_app_user_id() OR public.is_group_admin(public.slot_group_id(slot_id)));

DROP POLICY IF EXISTS subgroup_chat_mensajes_select_group_member ON public.subgroup_chat_mensajes;
CREATE POLICY subgroup_chat_mensajes_select_group_member ON public.subgroup_chat_mensajes
FOR SELECT TO authenticated
USING (public.is_group_member(public.subgroup_group_id(subgroup_id::bigint)));
DROP POLICY IF EXISTS subgroup_chat_mensajes_insert_member_self ON public.subgroup_chat_mensajes;
CREATE POLICY subgroup_chat_mensajes_insert_member_self ON public.subgroup_chat_mensajes
FOR INSERT TO authenticated
WITH CHECK (usuario_id = public.current_app_user_id() AND public.is_group_member(public.subgroup_group_id(subgroup_id::bigint)));
DROP POLICY IF EXISTS subgroup_chat_mensajes_delete_self_or_admin ON public.subgroup_chat_mensajes;
CREATE POLICY subgroup_chat_mensajes_delete_self_or_admin ON public.subgroup_chat_mensajes
FOR DELETE TO authenticated
USING (usuario_id = public.current_app_user_id() OR public.is_group_admin(public.subgroup_group_id(subgroup_id::bigint)));

COMMIT;
