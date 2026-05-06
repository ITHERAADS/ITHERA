alter table if exists public.trip_documents
  add column if not exists metadata jsonb not null default '{}'::jsonb;
