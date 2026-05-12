-- Issue #94 — Guardrails de longitud para textos principales de grupos/viajes.
-- Mantiene la regla documentada para M2 / CU-2.3:
-- nombre <= 60 caracteres y descripcion <= 300 caracteres.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'grupos_viaje_nombre_length_chk'
      AND conrelid = 'public.grupos_viaje'::regclass
  ) THEN
    ALTER TABLE public.grupos_viaje
      ADD CONSTRAINT grupos_viaje_nombre_length_chk
      CHECK (char_length(btrim(nombre)) BETWEEN 1 AND 60) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'grupos_viaje_descripcion_length_chk'
      AND conrelid = 'public.grupos_viaje'::regclass
  ) THEN
    ALTER TABLE public.grupos_viaje
      ADD CONSTRAINT grupos_viaje_descripcion_length_chk
      CHECK (descripcion IS NULL OR char_length(btrim(descripcion)) <= 300) NOT VALID;
  END IF;
END $$;

-- Ejecuta estas validaciones cuando hayas limpiado posibles registros antiguos que excedan los límites:
-- ALTER TABLE public.grupos_viaje VALIDATE CONSTRAINT grupos_viaje_nombre_length_chk;
-- ALTER TABLE public.grupos_viaje VALIDATE CONSTRAINT grupos_viaje_descripcion_length_chk;
