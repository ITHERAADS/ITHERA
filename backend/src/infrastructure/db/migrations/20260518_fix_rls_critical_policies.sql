-- ============================================================
-- ITHERA - Fix crítico de políticas RLS
-- Fecha: 2026-05-18
-- Descripción:
--   1. Elimina la política "Allow all" pública de `usuarios`.
--   2. Elimina políticas permisivas antiguas y duplicadas en
--      `comentario` y `voto` que exponían datos entre grupos.
--   3. Agrega políticas faltantes en `grupo_solicitudes_union`
--      y `trip_context_links` (tenían RLS habilitado sin ninguna
--      política → acceso completamente bloqueado).
-- ⚠️  Este script es SOLO DROP de políticas peligrosas + CREATE
--     de políticas faltantes. No altera ninguna tabla ni dato.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. usuarios: eliminar política pública "Allow all"
--    Esta política permitía acceso anónimo (rol public) a toda
--    la tabla usuarios. Es una brecha de seguridad crítica.
-- ============================================================
DROP POLICY IF EXISTS "Allow all" ON public.usuarios;


-- ============================================================
-- 2. comentario: eliminar las 3 políticas permisivas antiguas
--    que usaban USING (true) y permitían acceso irrestricto
--    entre grupos.
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can delete comentario" ON public.comentario;
DROP POLICY IF EXISTS "Authenticated users can insert comentario" ON public.comentario;
DROP POLICY IF EXISTS "Authenticated users can read comentario"   ON public.comentario;
DROP POLICY IF EXISTS "Authenticated users can update comentario" ON public.comentario;
-- Las políticas correctas (comentario_select_group_member, etc.) ya existen y se mantienen.


-- ============================================================
-- 3. voto: eliminar las 2 políticas permisivas antiguas.
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert voto" ON public.voto;
DROP POLICY IF EXISTS "Authenticated users can read voto"   ON public.voto;
-- Las políticas correctas (voto_select_group_member, etc.) ya existen y se mantienen.


-- ============================================================
-- 4. grupo_solicitudes_union: agregar políticas faltantes.
--    Esta tabla tenía RLS habilitado pero cero políticas,
--    lo que bloqueaba absolutamente todo el acceso.
--
--    Lógica de negocio:
--    - El solicitante puede ver y cancelar su propia solicitud.
--    - El admin del grupo puede ver, aprobar y rechazar.
-- ============================================================

-- El solicitante ve sus propias solicitudes
DROP POLICY IF EXISTS solicitudes_union_select_own ON public.grupo_solicitudes_union;
CREATE POLICY solicitudes_union_select_own ON public.grupo_solicitudes_union
FOR SELECT TO authenticated
USING (
  usuario_id = public.current_app_user_id()
  OR public.is_group_admin(grupo_id)
);

-- Solo el propio usuario puede crear una solicitud para sí mismo
DROP POLICY IF EXISTS solicitudes_union_insert_self ON public.grupo_solicitudes_union;
CREATE POLICY solicitudes_union_insert_self ON public.grupo_solicitudes_union
FOR INSERT TO authenticated
WITH CHECK (usuario_id = public.current_app_user_id());

-- El admin del grupo o el propio solicitante pueden actualizar (aprobar/rechazar/cancelar)
DROP POLICY IF EXISTS solicitudes_union_update_admin_or_self ON public.grupo_solicitudes_union;
CREATE POLICY solicitudes_union_update_admin_or_self ON public.grupo_solicitudes_union
FOR UPDATE TO authenticated
USING (
  public.is_group_admin(grupo_id)
  OR usuario_id = public.current_app_user_id()
)
WITH CHECK (
  public.is_group_admin(grupo_id)
  OR usuario_id = public.current_app_user_id()
);

-- Solo el admin puede borrar solicitudes
DROP POLICY IF EXISTS solicitudes_union_delete_admin ON public.grupo_solicitudes_union;
CREATE POLICY solicitudes_union_delete_admin ON public.grupo_solicitudes_union
FOR DELETE TO authenticated
USING (public.is_group_admin(grupo_id));


-- ============================================================
-- 5. trip_context_links: agregar políticas faltantes.
--    Esta tabla tenía RLS habilitado pero cero políticas,
--    lo que bloqueaba absolutamente todo el acceso.
--
--    Lógica: solo los miembros del grupo pueden ver/gestionar
--    los enlaces contextuales de su grupo.
-- ============================================================

DROP POLICY IF EXISTS trip_context_links_select_group_member ON public.trip_context_links;
CREATE POLICY trip_context_links_select_group_member ON public.trip_context_links
FOR SELECT TO authenticated
USING (public.is_group_member(group_id));

DROP POLICY IF EXISTS trip_context_links_insert_group_member ON public.trip_context_links;
CREATE POLICY trip_context_links_insert_group_member ON public.trip_context_links
FOR INSERT TO authenticated
WITH CHECK (
  public.is_group_member(group_id)
  AND created_by_user_id = public.current_app_user_id()
);

DROP POLICY IF EXISTS trip_context_links_delete_creator_or_admin ON public.trip_context_links;
CREATE POLICY trip_context_links_delete_creator_or_admin ON public.trip_context_links
FOR DELETE TO authenticated
USING (
  created_by_user_id = public.current_app_user_id()
  OR public.is_group_admin(group_id)
);

COMMIT;
