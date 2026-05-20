-- Soporte para delegación de administración con aceptación activa.
-- RNB-2.1: un único Admin activo por viaje.
-- RNB-2.2: la delegación requiere aceptación explícita del receptor.

CREATE TABLE IF NOT EXISTS public.admin_delegation_requests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  group_id bigint NOT NULL REFERENCES public.grupos_viaje(id) ON DELETE CASCADE,
  from_user_id bigint NOT NULL REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE,
  to_user_id bigint NOT NULL REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aceptada', 'rechazada', 'expirada', 'cancelada')),
  expires_at timestamptz NOT NULL,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_delegation_different_users CHECK (from_user_id <> to_user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_delegation_one_pending_per_group_idx
  ON public.admin_delegation_requests(group_id)
  WHERE status = 'pendiente';

CREATE INDEX IF NOT EXISTS admin_delegation_target_pending_idx
  ON public.admin_delegation_requests(to_user_id, status, expires_at);

CREATE INDEX IF NOT EXISTS admin_delegation_group_status_idx
  ON public.admin_delegation_requests(group_id, status, created_at DESC);
