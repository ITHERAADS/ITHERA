-- Guardrails para checkout simulado y propuesta ganadora única.
-- Ejecutar en Supabase SQL Editor si todavía no está aplicado.

ALTER TABLE public.vuelos
ADD COLUMN IF NOT EXISTS compra_estado text NOT NULL DEFAULT 'pendiente'
CHECK (compra_estado IN ('pendiente', 'checkout_iniciado', 'confirmada_simulada', 'cancelada'));

ALTER TABLE public.vuelos
ADD COLUMN IF NOT EXISTS compra_payload jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.vuelos
ADD COLUMN IF NOT EXISTS folio_compra text;

ALTER TABLE public.hospedajes
ADD COLUMN IF NOT EXISTS folio_reserva text;

-- Limpia aprobaciones duplicadas previas para que el índice único pueda crearse.
WITH ranked AS (
  SELECT
    id_propuesta,
    ROW_NUMBER() OVER (
      PARTITION BY grupo_id, tipo_item
      ORDER BY ultima_actualizacion DESC NULLS LAST, fecha_creacion DESC NULLS LAST, id_propuesta DESC
    ) AS rn
  FROM public.propuestas
  WHERE estado = 'aprobada'
    AND tipo_item IN ('vuelo', 'hospedaje')
)
UPDATE public.propuestas p
SET estado = 'descartada',
    ultima_actualizacion = now(),
    fecha_cierre = COALESCE(p.fecha_cierre, now())
FROM ranked r
WHERE p.id_propuesta = r.id_propuesta
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS ux_propuestas_unica_aprobada_por_tipo
ON public.propuestas (grupo_id, tipo_item)
WHERE estado = 'aprobada' AND tipo_item IN ('vuelo', 'hospedaje');

CREATE UNIQUE INDEX IF NOT EXISTS ux_vuelos_compra_confirmada_por_propuesta
ON public.vuelos (propuesta_id)
WHERE compra_estado = 'confirmada_simulada';

CREATE UNIQUE INDEX IF NOT EXISTS ux_hospedajes_reserva_confirmada_por_propuesta
ON public.hospedajes (propuesta_id)
WHERE reserva_estado = 'confirmada_simulada';
