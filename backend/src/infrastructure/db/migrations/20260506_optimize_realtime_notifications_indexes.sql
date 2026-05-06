-- Índices para reducir Disk IO en consultas frecuentes de colaboración/notificaciones.
-- Se pueden ejecutar varias veces sin duplicar índices.

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario_created_at
  ON public.notificaciones (usuario_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario_leida
  ON public.notificaciones (usuario_id, leida);

CREATE INDEX IF NOT EXISTS idx_notificaciones_grupo_created_at
  ON public.notificaciones (grupo_id, created_at DESC)
  WHERE grupo_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_usuarios_auth_user_id
  ON public.usuarios (auth_user_id);

CREATE INDEX IF NOT EXISTS idx_grupo_miembros_usuario_id
  ON public.grupo_miembros (usuario_id);

CREATE INDEX IF NOT EXISTS idx_grupo_miembros_grupo_id
  ON public.grupo_miembros (grupo_id);

CREATE INDEX IF NOT EXISTS idx_propuestas_grupo_estado
  ON public.propuestas (grupo_id, estado);

CREATE INDEX IF NOT EXISTS idx_propuestas_grupo_fecha_creacion
  ON public.propuestas (grupo_id, fecha_creacion DESC);

CREATE INDEX IF NOT EXISTS idx_voto_propuesta_usuario
  ON public.voto (id_propuesta, id_usuario);

CREATE INDEX IF NOT EXISTS idx_comentario_propuesta_created_at
  ON public.comentario (id_propuesta, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_chat_mensajes_grupo_created_at
  ON public.chat_mensajes (grupo_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_group_created_at
  ON public.expenses (group_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_user
  ON public.expense_splits (expense_id, user_id);

CREATE INDEX IF NOT EXISTS idx_settlement_payments_group_created_at
  ON public.settlement_payments (group_id, created_at DESC);
