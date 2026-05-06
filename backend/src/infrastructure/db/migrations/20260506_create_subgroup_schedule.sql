create table if not exists public.subgroup_slots (
  id bigserial primary key,
  group_id bigint not null references public.grupos_viaje(id) on delete cascade,
  itinerary_id bigint null references public.itinerarios(id_itinerario) on delete set null,
  title varchar not null,
  description text null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_by bigint not null references public.usuarios(id_usuario),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (
    extract(second from starts_at) = 0
    and extract(second from ends_at) = 0
    and mod(extract(minute from starts_at)::int, 30) = 0
    and mod(extract(minute from ends_at)::int, 30) = 0
  )
);

create table if not exists public.subgroups (
  id bigserial primary key,
  slot_id bigint not null references public.subgroup_slots(id) on delete cascade,
  name varchar not null,
  description text null,
  created_by bigint not null references public.usuarios(id_usuario),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subgroup_memberships (
  id bigserial primary key,
  slot_id bigint not null references public.subgroup_slots(id) on delete cascade,
  subgroup_id bigint null references public.subgroups(id) on delete set null,
  user_id bigint not null references public.usuarios(id_usuario) on delete cascade,
  assigned_by bigint null references public.usuarios(id_usuario),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slot_id, user_id)
);

create table if not exists public.subgroup_activities (
  id bigserial primary key,
  slot_id bigint not null references public.subgroup_slots(id) on delete cascade,
  subgroup_id bigint not null references public.subgroups(id) on delete cascade,
  title varchar not null,
  description text null,
  location varchar null,
  starts_at timestamptz null,
  ends_at timestamptz null,
  created_by bigint not null references public.usuarios(id_usuario),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists idx_subgroup_slots_group_id on public.subgroup_slots(group_id);
create index if not exists idx_subgroup_slots_itinerary_id on public.subgroup_slots(itinerary_id);
create index if not exists idx_subgroups_slot_id on public.subgroups(slot_id);
create index if not exists idx_subgroup_memberships_slot_id on public.subgroup_memberships(slot_id);
create index if not exists idx_subgroup_memberships_subgroup_id on public.subgroup_memberships(subgroup_id);
create index if not exists idx_subgroup_memberships_user_id on public.subgroup_memberships(user_id);
create index if not exists idx_subgroup_activities_slot_id on public.subgroup_activities(slot_id);
create index if not exists idx_subgroup_activities_subgroup_id on public.subgroup_activities(subgroup_id);

create or replace function public.validate_subgroup_membership_slot()
returns trigger
language plpgsql
as $$
begin
  if new.subgroup_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.subgroups s
    where s.id = new.subgroup_id
      and s.slot_id = new.slot_id
  ) then
    raise exception 'subgroup_id no pertenece al slot_id enviado';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_subgroup_membership_slot on public.subgroup_memberships;
create trigger trg_validate_subgroup_membership_slot
before insert or update on public.subgroup_memberships
for each row
execute function public.validate_subgroup_membership_slot();

create or replace function public.validate_subgroup_activity_slot()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.subgroups s
    where s.id = new.subgroup_id
      and s.slot_id = new.slot_id
  ) then
    raise exception 'subgroup_id no pertenece al slot_id enviado';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_subgroup_activity_slot on public.subgroup_activities;
create trigger trg_validate_subgroup_activity_slot
before insert or update on public.subgroup_activities
for each row
execute function public.validate_subgroup_activity_slot();
