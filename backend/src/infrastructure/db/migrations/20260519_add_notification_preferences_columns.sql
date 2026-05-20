-- Archivo: 20260519_add_notification_preferences_columns.sql
-- Descripción: Agrega las columnas notificaciones_finanzas y notificaciones_alertas a la tabla usuario_preferencias_notificacion.

ALTER TABLE public.usuario_preferencias_notificacion 
  ADD COLUMN IF NOT EXISTS notificaciones_finanzas BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notificaciones_alertas BOOLEAN NOT NULL DEFAULT TRUE;
