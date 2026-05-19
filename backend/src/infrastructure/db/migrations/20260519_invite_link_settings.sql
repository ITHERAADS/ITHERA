-- CU-2.5 — configuración de enlaces de invitación.
-- Agrega expiración configurable, límite de usos y contador de uso del enlace.

ALTER TABLE public.grupos_viaje
  ADD COLUMN IF NOT EXISTS invitacion_expires_at timestamp with time zone DEFAULT (now() + interval '7 days'),
  ADD COLUMN IF NOT EXISTS invitacion_max_usos integer,
  ADD COLUMN IF NOT EXISTS invitacion_usos_actuales integer NOT NULL DEFAULT 0;

UPDATE public.grupos_viaje
SET invitacion_expires_at = COALESCE(invitacion_expires_at, now() + interval '7 days'),
    invitacion_usos_actuales = COALESCE(invitacion_usos_actuales, 0)
WHERE invitacion_expires_at IS NULL
   OR invitacion_usos_actuales IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'grupos_viaje_invitacion_max_usos_chk'
  ) THEN
    ALTER TABLE public.grupos_viaje
      ADD CONSTRAINT grupos_viaje_invitacion_max_usos_chk
      CHECK (invitacion_max_usos IS NULL OR (invitacion_max_usos >= 1 AND invitacion_max_usos <= 50)) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'grupos_viaje_invitacion_usos_actuales_chk'
  ) THEN
    ALTER TABLE public.grupos_viaje
      ADD CONSTRAINT grupos_viaje_invitacion_usos_actuales_chk
      CHECK (invitacion_usos_actuales >= 0) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_grupos_viaje_codigo_inv_estado_expira
  ON public.grupos_viaje (codigo_invitacion, estado, invitacion_expires_at);
