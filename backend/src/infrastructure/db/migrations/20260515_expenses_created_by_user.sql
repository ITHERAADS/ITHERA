begin;

alter table if exists public.expenses
  add column if not exists created_by_user_id bigint;

update public.expenses
set created_by_user_id = paid_by_user_id
where created_by_user_id is null;

alter table if exists public.expenses
  alter column created_by_user_id set not null;

alter table if exists public.expenses
  drop constraint if exists expenses_created_by_user_id_fkey;

alter table if exists public.expenses
  add constraint expenses_created_by_user_id_fkey
  foreign key (created_by_user_id) references public.usuarios(id_usuario);

create index if not exists expenses_group_creator_idx
  on public.expenses(group_id, created_by_user_id);

commit;
