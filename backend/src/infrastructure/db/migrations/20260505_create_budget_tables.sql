alter table if exists public.grupos_viaje
  add column if not exists presupuesto_total numeric(12, 2) not null default 0;

create table if not exists public.expenses (
  id bigserial primary key,
  group_id bigint not null references public.grupos_viaje(id) on delete cascade,
  paid_by_user_id bigint not null references public.usuarios(id_usuario),
  amount numeric(12, 2) not null check (amount > 0),
  description text not null,
  category text not null check (category in ('transporte', 'hospedaje', 'actividad', 'comida', 'otro')),
  split_type text not null default 'equitativa' check (split_type in ('equitativa', 'personalizada')),
  expense_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expense_splits (
  id bigserial primary key,
  expense_id bigint not null references public.expenses(id) on delete cascade,
  user_id bigint not null references public.usuarios(id_usuario),
  share numeric(12, 2) not null check (share >= 0),
  settled boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists expenses_group_id_idx on public.expenses(group_id);
create index if not exists expense_splits_expense_id_idx on public.expense_splits(expense_id);
create unique index if not exists expense_splits_expense_user_idx
  on public.expense_splits(expense_id, user_id);
