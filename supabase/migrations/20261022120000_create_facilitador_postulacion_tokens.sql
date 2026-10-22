-- Migration: 20261022120000_create_facilitador_postulacion_tokens.sql
-- Module: capacitacion
-- Purpose: Dynamic invitation tokens for public facilitator candidate applications

create table if not exists public.facilitador_postulacion_tokens (
  id                  bigint generated always as identity primary key,
  token               text not null unique,
  nombre_candidato    text,
  email_candidato     text,
  notas               text,
  dias_validez        integer not null default 7,
  expires_at          timestamptz not null,
  used_at             timestamptz,
  entrevista_id       bigint references public.facilitador_entrevistas(id) on delete set null,
  is_active           boolean not null default true,
  creado_por          bigint references public.usuarios(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Alter facilitador_entrevistas to track origin and invitation link
alter table public.facilitador_entrevistas
  add column if not exists origen text not null default 'interno',
  add column if not exists postulacion_token_id bigint references public.facilitador_postulacion_tokens(id) on delete set null;

-- Ensure check constraint on origen
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'facilitador_entrevistas_origen_check'
  ) then
    alter table public.facilitador_entrevistas
      add constraint facilitador_entrevistas_origen_check
      check (origen in ('interno', 'web'));
  end if;
end $$;

-- Indexes (note: 'token' column already has an automatic unique index from UNIQUE constraint)
create index if not exists idx_fac_postulacion_tokens_expires on public.facilitador_postulacion_tokens (expires_at);
create index if not exists idx_fac_postulacion_tokens_is_active on public.facilitador_postulacion_tokens (is_active);
create index if not exists idx_fac_entrevistas_origen on public.facilitador_entrevistas (origen);

-- RLS: Table is strictly restricted to service_role.
-- Token creation, listing, revocation, validation and submissions are handled
-- entirely server-side via Server Actions with user session verification.
-- Direct PostgREST access by authenticated or anon clients is completely blocked.
alter table public.facilitador_postulacion_tokens enable row level security;

drop policy if exists "fac_postulacion_tokens_service_role" on public.facilitador_postulacion_tokens;
create policy "fac_postulacion_tokens_service_role" on public.facilitador_postulacion_tokens
  for all to service_role using (true) with check (true);

-- Drop any broad legacy policies if re-running
drop policy if exists "fac_postulacion_tokens_read" on public.facilitador_postulacion_tokens;
drop policy if exists "fac_postulacion_tokens_insert" on public.facilitador_postulacion_tokens;
drop policy if exists "fac_postulacion_tokens_update" on public.facilitador_postulacion_tokens;
drop policy if exists "fac_postulacion_tokens_delete" on public.facilitador_postulacion_tokens;

-- Trigger for updated_at
drop trigger if exists fac_postulacion_tokens_updated_at on public.facilitador_postulacion_tokens;
create trigger fac_postulacion_tokens_updated_at
  before update on public.facilitador_postulacion_tokens
  for each row execute function public.set_updated_at();
