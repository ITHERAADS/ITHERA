create table if not exists public.settlement_payments (
  id bigserial primary key,
  group_id bigint not null references public.grupos_viaje(id) on delete cascade,
  from_user_id bigint not null references public.usuarios(id_usuario),
  to_user_id bigint not null references public.usuarios(id_usuario),
  amount numeric(12, 2) not null check (amount > 0),
  status text not null default 'pagado' check (status in ('pagado')),
  note text,
  paid_at timestamptz not null default now(),
  created_by_user_id bigint not null references public.usuarios(id_usuario),
  created_at timestamptz not null default now()
);

create index if not exists settlement_payments_group_id_idx
  on public.settlement_payments(group_id);

create index if not exists settlement_payments_pair_idx
  on public.settlement_payments(group_id, from_user_id, to_user_id);
