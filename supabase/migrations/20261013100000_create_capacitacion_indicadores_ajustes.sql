-- Migration: 20261013100000_create_capacitacion_indicadores_ajustes.sql
-- Module: capacitacion
-- Purpose: Dedicated table for manual date adjustments in the 72h certificates indicators view.
-- Allows users to record actual execution and/or certificate issuance dates without modifying
-- core tables (ejecucion_osi, osi_sesion, certificados).

create table if not exists public.capacitacion_indicadores_ajustes (
  id bigint generated always as identity primary key,
  osi_id bigint not null unique references public.ejecucion_osi(id) on delete cascade,
  fecha_ejecucion date,
  fecha_emision date,
  motivo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null
);

-- Trigger function to automatically maintain updated_at and updated_by on modifications
create or replace function public.set_capacitacion_indicadores_ajustes_timestamps()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  if auth.uid() is not null then
    new.updated_by = auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_capacitacion_indicadores_ajustes_timestamps
  on public.capacitacion_indicadores_ajustes;

create trigger trg_capacitacion_indicadores_ajustes_timestamps
  before update on public.capacitacion_indicadores_ajustes
  for each row
  execute function public.set_capacitacion_indicadores_ajustes_timestamps();

-- Enable Row Level Security
alter table public.capacitacion_indicadores_ajustes enable row level security;

-- RLS Policies (rerun-safe via DROP POLICY IF EXISTS)
-- 1. Read: Any authenticated user can read indicators adjustments
drop policy if exists "Allow select capacitacion_indicadores_ajustes for authenticated"
  on public.capacitacion_indicadores_ajustes;

create policy "Allow select capacitacion_indicadores_ajustes for authenticated"
  on public.capacitacion_indicadores_ajustes
  for select
  to authenticated
  using (true);

-- 2. Insert: Authenticated users can insert adjustment records
drop policy if exists "Allow insert capacitacion_indicadores_ajustes for authenticated"
  on public.capacitacion_indicadores_ajustes;

create policy "Allow insert capacitacion_indicadores_ajustes for authenticated"
  on public.capacitacion_indicadores_ajustes
  for insert
  to authenticated
  with check (auth.uid() is not null);

-- 3. Update: Authenticated users can update adjustment records
drop policy if exists "Allow update capacitacion_indicadores_ajustes for authenticated"
  on public.capacitacion_indicadores_ajustes;

create policy "Allow update capacitacion_indicadores_ajustes for authenticated"
  on public.capacitacion_indicadores_ajustes
  for update
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- 4. Delete: Authenticated users can delete adjustment records (reset dates)
drop policy if exists "Allow delete capacitacion_indicadores_ajustes for authenticated"
  on public.capacitacion_indicadores_ajustes;

create policy "Allow delete capacitacion_indicadores_ajustes for authenticated"
  on public.capacitacion_indicadores_ajustes
  for delete
  to authenticated
  using (auth.uid() is not null);

-- Table Grants for Data API (PostgREST)
grant select, insert, update, delete on public.capacitacion_indicadores_ajustes to authenticated;
grant select, insert, update, delete on public.capacitacion_indicadores_ajustes to service_role;
