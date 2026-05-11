create table if not exists public.trip_context_links (
  id bigserial primary key,
  group_id bigint not null references public.grupos_viaje(id) on delete cascade,
  entity_a_type text not null check (entity_a_type in ('expense', 'document', 'activity', 'subgroup_activity')),
  entity_a_id text not null,
  entity_b_type text not null check (entity_b_type in ('expense', 'document', 'activity', 'subgroup_activity')),
  entity_b_id text not null,
  created_by_user_id bigint not null references public.usuarios(id_usuario),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (entity_a_type <> entity_b_type or entity_a_id <> entity_b_id)
);

create unique index if not exists trip_context_links_unique_pair_idx
  on public.trip_context_links(group_id, entity_a_type, entity_a_id, entity_b_type, entity_b_id);

create index if not exists trip_context_links_group_idx
  on public.trip_context_links(group_id);

create index if not exists trip_context_links_entity_a_idx
  on public.trip_context_links(group_id, entity_a_type, entity_a_id);

create index if not exists trip_context_links_entity_b_idx
  on public.trip_context_links(group_id, entity_b_type, entity_b_id);

insert into public.trip_context_links (
  group_id,
  entity_a_type,
  entity_a_id,
  entity_b_type,
  entity_b_id,
  created_by_user_id,
  metadata,
  created_at,
  updated_at
)
select
  e.group_id,
  'document',
  ed.trip_document_id::text,
  'expense',
  ed.expense_id::text,
  e.paid_by_user_id,
  jsonb_build_object('source', 'expense_documents'),
  ed.created_at,
  ed.created_at
from public.expense_documents ed
join public.expenses e on e.id = ed.expense_id
on conflict (group_id, entity_a_type, entity_a_id, entity_b_type, entity_b_id) do nothing;

insert into public.trip_context_links (
  group_id,
  entity_a_type,
  entity_a_id,
  entity_b_type,
  entity_b_id,
  created_by_user_id,
  metadata,
  created_at,
  updated_at
)
select
  td.trip_id,
  case
    when td.linked_type = 'actividad' then 'activity'
    else 'document'
  end,
  case
    when td.linked_type = 'actividad' then td.linked_id::text
    else td.id::text
  end,
  case
    when td.linked_type = 'gasto' then 'expense'
    when td.linked_type = 'actividad' then 'document'
    else null
  end,
  case
    when td.linked_type = 'actividad' then td.id::text
    else td.linked_id::text
  end,
  u.id_usuario,
  jsonb_build_object('source', 'trip_documents.linked_type'),
  td.created_at,
  td.created_at
from public.trip_documents td
join public.usuarios u on u.auth_user_id = td.user_id
where td.linked_type in ('gasto', 'actividad')
  and td.linked_id is not null
on conflict (group_id, entity_a_type, entity_a_id, entity_b_type, entity_b_id) do nothing;
