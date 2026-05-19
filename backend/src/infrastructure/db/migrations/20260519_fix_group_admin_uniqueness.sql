-- ITHERA · Fix RNB-2.1
-- Garantiza que exista como máximo un administrador activo por viaje.
-- Ejecutar en Supabase SQL Editor después de revisar/normalizar datos existentes.

WITH ranked_admins AS (
  SELECT
    id,
    grupo_id,
    ROW_NUMBER() OVER (PARTITION BY grupo_id ORDER BY joined_at ASC NULLS LAST, id ASC) AS rn
  FROM public.grupo_miembros
  WHERE rol = 'admin'
)
UPDATE public.grupo_miembros gm
SET rol = 'viajero'
FROM ranked_admins ra
WHERE gm.id = ra.id
  AND ra.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS ux_grupo_miembros_single_admin
ON public.grupo_miembros (grupo_id)
WHERE rol = 'admin';
