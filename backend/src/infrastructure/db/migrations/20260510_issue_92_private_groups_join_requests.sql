-- INC-IMPL-09 / Issue #92
-- Privacidad real de grupos y bandeja de aprobación de solicitudes.

ALTER TABLE public.grupos_viaje
  ADD COLUMN IF NOT EXISTS es_publico boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.grupo_solicitudes_union (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  grupo_id bigint NOT NULL REFERENCES public.grupos_viaje(id) ON DELETE CASCADE,
  usuario_id bigint NOT NULL REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE,
  codigo_invitacion character varying NOT NULL,
  estado character varying NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'aprobada', 'rechazada', 'cancelada')),
  mensaje text,
  resuelta_por bigint REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT grupo_solicitudes_union_unique_pending
    UNIQUE (grupo_id, usuario_id, estado)
);

CREATE INDEX IF NOT EXISTS idx_grupo_solicitudes_union_grupo_estado
  ON public.grupo_solicitudes_union(grupo_id, estado, created_at);

CREATE INDEX IF NOT EXISTS idx_grupo_solicitudes_union_usuario
  ON public.grupo_solicitudes_union(usuario_id, created_at);
