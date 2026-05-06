-- ============================================================
-- Migración: Bóveda de documentos del viaje (RF-3.12 / CU-3.8)
-- ============================================================

-- 1. Tabla de metadatos de documentos
CREATE TABLE IF NOT EXISTS trip_documents (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id       BIGINT NOT NULL REFERENCES grupos_viaje(id) ON DELETE CASCADE,
  user_id       UUID   NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  file_name     VARCHAR(512) NOT NULL,
  file_path     VARCHAR(1024) NOT NULL,  -- ruta dentro del bucket de storage
  file_url      TEXT NOT NULL,            -- URL pública o firmada
  mime_type     VARCHAR(128),
  file_size     BIGINT,                   -- tamaño en bytes
  category      VARCHAR(64) NOT NULL DEFAULT 'otro',
  -- categorías esperadas: 'boleto', 'visado', 'reserva', 'pasaporte', 'seguro', 'otro'
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 2. Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_trip_documents_trip_id  ON trip_documents(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_documents_user_id  ON trip_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_documents_category ON trip_documents(category);

-- 3. Crear el bucket de Storage (ejecutar desde el Dashboard de Supabase o con la API de admin)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('trip-documents', 'trip-documents', true)
-- ON CONFLICT (id) DO NOTHING;

-- NOTA: Si prefieres archivos privados (requiere signed URLs), cambia `public` a `false`.
-- Para este proyecto usaremos URLs públicas para simplificar la integración con el frontend.
