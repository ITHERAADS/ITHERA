-- ====================================================================
-- MIGRACIÓN DE OPTIMIZACIÓN: ÍNDICES DE BASE DE DATOS PARA ESTRÉS
-- ====================================================================
-- Descripción: Creación de índice B-Tree sobre la columna codigo_invitacion
-- en la tabla grupos_viaje para optimizar el rendimiento bajo concurrencia
-- y evitar Sequential Scans al resolver invitaciones/previsualizaciones.

CREATE INDEX IF NOT EXISTS idx_grupos_viaje_codigo_invitacion 
ON grupos_viaje (codigo_invitacion);

-- Comentario explicativo en la base de datos
COMMENT ON INDEX idx_grupos_viaje_codigo_invitacion IS 'Índice B-Tree optimizado para acelerar las previsualizaciones y uniones a grupos bajo alta concurrencia de lectura.';
