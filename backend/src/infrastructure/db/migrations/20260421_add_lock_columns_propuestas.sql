-- Migración: Agregar columnas de bloqueo a propuestas
-- Fecha: 2026-04-21
-- Descripción: Permite el flujo ITEM_LOCKED para edición exclusiva de propuestas

ALTER TABLE propuestas 
  ADD COLUMN IF NOT EXISTS bloqueado_por INTEGER REFERENCES usuarios(id_usuario) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fecha_bloqueo TIMESTAMPTZ DEFAULT NULL;

-- Índice parcial para búsquedas rápidas de bloqueos activos por usuario (usado en onDisconnect)
CREATE INDEX IF NOT EXISTS idx_propuestas_bloqueado_por 
  ON propuestas(bloqueado_por) 
  WHERE bloqueado_por IS NOT NULL;
