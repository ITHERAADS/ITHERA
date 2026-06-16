-- Issue #252: límite lógico para presupuesto_total al crear viajes.
-- Mantiene consistencia con ERR-23-004 y evita montos excesivos que rompan UI/peticiones.

ALTER TABLE public.grupos_viaje
  DROP CONSTRAINT IF EXISTS grupos_viaje_presupuesto_total_check;

ALTER TABLE public.grupos_viaje
  ADD CONSTRAINT grupos_viaje_presupuesto_total_check
  CHECK (presupuesto_total > 0::numeric AND presupuesto_total <= 9999999999.99::numeric);
