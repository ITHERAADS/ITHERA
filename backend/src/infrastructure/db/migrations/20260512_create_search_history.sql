-- Migración para el historial de búsquedas
-- Archivo: 20260512_create_search_history.sql

CREATE TABLE IF NOT EXISTS public.search_history (
  id bigserial primary key,
  user_id bigint not null references public.usuarios(id_usuario) on delete cascade,
  search_type text not null check (search_type in ('flights', 'hotels', 'places', 'other')),
  query_params jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS search_history_user_id_idx ON public.search_history(user_id);
CREATE INDEX IF NOT EXISTS search_history_search_type_idx ON public.search_history(search_type);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS:
-- Los usuarios solo pueden ver y crear su propio historial de búsquedas
CREATE POLICY "Users can view their own search history"
  ON public.search_history
  FOR SELECT
  USING (user_id = (select id_usuario from public.usuarios where auth_user_id = auth.uid()));

CREATE POLICY "Users can insert their own search history"
  ON public.search_history
  FOR INSERT
  WITH CHECK (user_id = (select id_usuario from public.usuarios where auth_user_id = auth.uid()));

CREATE POLICY "Users can delete their own search history"
  ON public.search_history
  FOR DELETE
  USING (user_id = (select id_usuario from public.usuarios where auth_user_id = auth.uid()));
