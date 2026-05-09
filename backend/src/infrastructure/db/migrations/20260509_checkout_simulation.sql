ALTER TABLE public.vuelos
ADD COLUMN IF NOT EXISTS compra_estado text NOT NULL DEFAULT 'pendiente'
CHECK (compra_estado IN ('pendiente', 'checkout_iniciado', 'confirmada_simulada', 'cancelada'));

ALTER TABLE public.vuelos
ADD COLUMN IF NOT EXISTS compra_payload jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.vuelos
ADD COLUMN IF NOT EXISTS folio_compra text;

ALTER TABLE public.hospedajes
ADD COLUMN IF NOT EXISTS folio_reserva text;

CREATE INDEX IF NOT EXISTS idx_vuelos_folio_compra ON public.vuelos(folio_compra);
CREATE INDEX IF NOT EXISTS idx_hospedajes_folio_reserva ON public.hospedajes(folio_reserva);
