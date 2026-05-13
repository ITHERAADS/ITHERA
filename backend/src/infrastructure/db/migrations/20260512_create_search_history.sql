-- Migration: create historial_busquedas
-- Sprint 11 · Módulo 7 — Historial de Búsquedas

CREATE TABLE IF NOT EXISTS historial_busquedas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    UUID NOT NULL,
  grupo_id      UUID,
  tipo          TEXT NOT NULL CHECK (tipo IN ('vuelo', 'hospedaje', 'lugar', 'ruta')),
  parametros    JSONB NOT NULL,
  resultado_cache JSONB NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_historial_usuario ON historial_busquedas(usuario_id, expires_at);
