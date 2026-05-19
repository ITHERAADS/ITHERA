create table if not exists public.historial_busquedas (
  id bigserial primary key,
  grupo_id bigint not null references public.grupos_viaje(id) on delete cascade,
  usuario_id bigint not null references public.usuarios(id_usuario) on delete cascade,
  tipo_item text not null check (tipo_item in ('vuelo', 'hospedaje')),
  fuente text not null,
  titulo text not null,
  descripcion text null,
  search_payload jsonb null,
  result_payload jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists historial_busquedas_grupo_idx
  on public.historial_busquedas(grupo_id, created_at desc);

create index if not exists historial_busquedas_usuario_idx
  on public.historial_busquedas(usuario_id, created_at desc);

