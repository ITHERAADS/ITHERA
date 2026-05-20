-- Flujo de pagos de liquidacion:
-- 1) deudor registra pago (pendiente_validacion)
-- 2) acreedor confirma o rechaza evidencia
-- 3) solo pagos confirmados impactan liquidaciones pendientes

begin;

alter table if exists public.settlement_payments
  add column if not exists payment_method text,
  add column if not exists reviewed_by_user_id bigint references public.usuarios(id_usuario),
  add column if not exists reviewed_at timestamptz,
  add column if not exists rejection_reason text;

-- Elimina checks de status existentes sin depender del nombre exacto del constraint.
do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'settlement_payments'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format('alter table public.settlement_payments drop constraint %I', r.conname);
  end loop;
end $$;

-- Compatibilidad con datos existentes: "pagado" pasa a "confirmado".
update public.settlement_payments
set status = case
  when status in ('pagado', 'confirmado') then 'confirmado'
  when status = 'rechazado' then 'rechazado'
  when status = 'pendiente_validacion' then 'pendiente_validacion'
  else 'pendiente_validacion'
end;

alter table public.settlement_payments
  add constraint settlement_payments_status_check
  check (status in ('pendiente_validacion', 'confirmado', 'rechazado'));

-- Elimina checks de payment_method existentes para recrearlos de forma idempotente.
do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'settlement_payments'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%payment_method%'
  loop
    execute format('alter table public.settlement_payments drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.settlement_payments
  add constraint settlement_payments_payment_method_check
  check (
    payment_method is null
    or payment_method in ('efectivo_presencial', 'transferencia')
  );

alter table public.settlement_payments
  alter column status set default 'pendiente_validacion';

create index if not exists settlement_payments_status_idx
  on public.settlement_payments(status);

create index if not exists settlement_payments_reviewed_by_idx
  on public.settlement_payments(reviewed_by_user_id);

commit;
