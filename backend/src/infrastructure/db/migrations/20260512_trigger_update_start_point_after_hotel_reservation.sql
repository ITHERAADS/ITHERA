-- Actualiza automáticamente el punto de partida del viaje cuando se confirma una reserva de hospedaje.
-- Lógica:
-- 1) Al reservar hotel: grupos_viaje.punto_partida_* pasa al hotel confirmado.
-- 2) Si no hay hotel confirmado: el punto de partida vuelve al destino original del viaje.
-- 3) No se sobrescriben destino_latitud/destino_longitud para conservar el destino original del viaje.

ALTER TABLE public.grupos_viaje
  ADD COLUMN IF NOT EXISTS punto_partida_tipo text NOT NULL DEFAULT 'destino_viaje'
    CHECK (punto_partida_tipo IN ('destino_viaje', 'hotel_reservado')),
  ADD COLUMN IF NOT EXISTS punto_partida_nombre text,
  ADD COLUMN IF NOT EXISTS punto_partida_direccion text,
  ADD COLUMN IF NOT EXISTS punto_partida_latitud numeric,
  ADD COLUMN IF NOT EXISTS punto_partida_longitud numeric,
  ADD COLUMN IF NOT EXISTS punto_partida_place_id text,
  ADD COLUMN IF NOT EXISTS punto_partida_hospedaje_id bigint,
  ADD COLUMN IF NOT EXISTS punto_partida_propuesta_id bigint,
  ADD COLUMN IF NOT EXISTS punto_partida_actualizado_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_grupos_viaje_punto_partida_hotel
  ON public.grupos_viaje (punto_partida_tipo, punto_partida_hospedaje_id);

CREATE INDEX IF NOT EXISTS idx_hospedajes_confirmadas_por_propuesta
  ON public.hospedajes (propuesta_id, reserva_estado, ultima_actualizacion DESC)
  WHERE reserva_estado = 'confirmada_simulada';

CREATE OR REPLACE FUNCTION public.sync_group_start_point_from_confirmed_hotel(p_group_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hotel record;
BEGIN
  SELECT
    h.id_hospedaje,
    h.propuesta_id,
    h.nombre,
    h.direccion,
    h.latitud,
    h.longitud,
    h.google_place_id,
    h.ultima_actualizacion,
    h.fecha_creacion
  INTO v_hotel
  FROM public.hospedajes h
  JOIN public.propuestas p ON p.id_propuesta = h.propuesta_id
  WHERE p.grupo_id = p_group_id
    AND p.tipo_item = 'hospedaje'
    AND h.reserva_estado = 'confirmada_simulada'
    AND h.latitud IS NOT NULL
    AND h.longitud IS NOT NULL
  ORDER BY h.ultima_actualizacion DESC NULLS LAST, h.fecha_creacion DESC NULLS LAST, h.id_hospedaje DESC
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.grupos_viaje
    SET
      punto_partida_tipo = 'hotel_reservado',
      punto_partida_nombre = v_hotel.nombre,
      punto_partida_direccion = COALESCE(v_hotel.direccion, v_hotel.nombre),
      punto_partida_latitud = v_hotel.latitud,
      punto_partida_longitud = v_hotel.longitud,
      punto_partida_place_id = v_hotel.google_place_id,
      punto_partida_hospedaje_id = v_hotel.id_hospedaje,
      punto_partida_propuesta_id = v_hotel.propuesta_id,
      punto_partida_actualizado_at = now()
    WHERE id = p_group_id;
  ELSE
    UPDATE public.grupos_viaje
    SET
      punto_partida_tipo = 'destino_viaje',
      punto_partida_nombre = destino,
      punto_partida_direccion = COALESCE(destino_formatted_address, destino),
      punto_partida_latitud = destino_latitud,
      punto_partida_longitud = destino_longitud,
      punto_partida_place_id = destino_place_id,
      punto_partida_hospedaje_id = NULL,
      punto_partida_propuesta_id = NULL,
      punto_partida_actualizado_at = now()
    WHERE id = p_group_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_group_start_point_after_hotel_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id bigint;
BEGIN
  SELECT grupo_id INTO v_group_id
  FROM public.propuestas
  WHERE id_propuesta = NEW.propuesta_id;

  IF v_group_id IS NOT NULL THEN
    PERFORM public.sync_group_start_point_from_confirmed_hotel(v_group_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hospedajes_sync_group_start_point_after_reservation ON public.hospedajes;

CREATE TRIGGER hospedajes_sync_group_start_point_after_reservation
AFTER INSERT OR UPDATE OF reserva_estado, latitud, longitud, nombre, direccion, google_place_id, ultima_actualizacion
ON public.hospedajes
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_group_start_point_after_hotel_reservation();

-- Inicializa los viajes existentes con su destino original cuando aún no tienen punto de partida persistido.
UPDATE public.grupos_viaje
SET
  punto_partida_tipo = 'destino_viaje',
  punto_partida_nombre = destino,
  punto_partida_direccion = COALESCE(destino_formatted_address, destino),
  punto_partida_latitud = destino_latitud,
  punto_partida_longitud = destino_longitud,
  punto_partida_place_id = destino_place_id,
  punto_partida_actualizado_at = COALESCE(punto_partida_actualizado_at, now())
WHERE punto_partida_actualizado_at IS NULL;

-- Sincroniza de inmediato los grupos que ya tengan hospedajes confirmados antes de crear este trigger.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT p.grupo_id
    FROM public.hospedajes h
    JOIN public.propuestas p ON p.id_propuesta = h.propuesta_id
    WHERE h.reserva_estado = 'confirmada_simulada'
  LOOP
    PERFORM public.sync_group_start_point_from_confirmed_hotel(r.grupo_id);
  END LOOP;
END;
$$;
