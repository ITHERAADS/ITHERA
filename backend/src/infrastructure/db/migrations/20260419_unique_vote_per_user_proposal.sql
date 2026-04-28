-- Garantiza voto único por usuario en cada propuesta
CREATE UNIQUE INDEX IF NOT EXISTS ux_voto_unique_user_propuesta
ON public.voto (id_propuesta, id_usuario);
