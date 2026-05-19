-- ITHERA · Issue #196/#197 support
-- Permite que un usuario expulsado pueda solicitar unirse otra vez sin que
-- una solicitud aprobada histórica bloquee la nueva aprobación.

ALTER TABLE public.grupo_solicitudes_union
  DROP CONSTRAINT IF EXISTS grupo_solicitudes_union_unique_pending;

WITH ranked_pending AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY grupo_id, usuario_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.grupo_solicitudes_union
  WHERE estado = 'pendiente'
)
UPDATE public.grupo_solicitudes_union s
SET estado = 'cancelada', updated_at = now()
FROM ranked_pending rp
WHERE s.id = rp.id
  AND rp.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS ux_grupo_solicitudes_union_pending
  ON public.grupo_solicitudes_union (grupo_id, usuario_id)
  WHERE estado = 'pendiente';
