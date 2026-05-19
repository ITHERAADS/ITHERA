-- ITHERA · M2 P-M2-04 · Control de módulos y cierre de viaje
-- Ejecutar en Supabase antes de desplegar los cambios de backend/front.

ALTER TABLE public.grupos_viaje
  ADD COLUMN IF NOT EXISTS modulo_itinerario_bloqueado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS modulo_presupuesto_bloqueado boolean NOT NULL DEFAULT false;

UPDATE public.grupos_viaje
SET
  modulo_itinerario_bloqueado = true,
  modulo_presupuesto_bloqueado = true
WHERE lower(coalesce(estado, '')) IN ('cerrado', 'archivado', 'finalizado');

CREATE INDEX IF NOT EXISTS idx_grupos_viaje_estado
  ON public.grupos_viaje (estado);
