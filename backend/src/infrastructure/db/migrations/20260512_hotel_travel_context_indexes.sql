-- Optimiza la resolución del punto de partida del viaje.
-- Si existe una reserva de hospedaje confirmada, las pantallas de mapa/rutas usan el hotel como origen.
-- Si no existe, se mantiene el destino configurado al crear el viaje.

CREATE INDEX IF NOT EXISTS idx_propuestas_grupo_tipo_estado
  ON public.propuestas (grupo_id, tipo_item, estado);

CREATE INDEX IF NOT EXISTS idx_hospedajes_propuesta_reserva_estado
  ON public.hospedajes (propuesta_id, reserva_estado, ultima_actualizacion DESC);
