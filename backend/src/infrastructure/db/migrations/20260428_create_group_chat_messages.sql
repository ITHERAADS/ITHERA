CREATE TABLE IF NOT EXISTS public.chat_mensajes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  grupo_id bigint NOT NULL REFERENCES public.grupos_viaje(id) ON DELETE CASCADE,
  usuario_id bigint NOT NULL REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE,
  contenido text NOT NULL CHECK (char_length(trim(contenido)) > 0 AND char_length(contenido) <= 1000),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_mensajes_grupo_created_at
  ON public.chat_mensajes (grupo_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_mensajes_usuario
  ON public.chat_mensajes (usuario_id);
