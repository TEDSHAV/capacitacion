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
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_capacitacion_indicadores_ajustes_osi_id
  on public.capacitacion_indicadores_ajustes(osi_id);

alter table public.capacitacion_indicadores_ajustes enable row level security;

create policy "Allow read capacitacion_indicadores_ajustes for authenticated users"
  on public.capacitacion_indicadores_ajustes
  for select
  to authenticated
  using (true);

create policy "Allow modify capacitacion_indicadores_ajustes for authenticated users"
  on public.capacitacion_indicadores_ajustes
  for all
  to authenticated
  using (true)
  with check (true);

create policy "Allow all for service role on capacitacion_indicadores_ajustes"
  on public.capacitacion_indicadores_ajustes
  for all
  to service_role
  using (true)
  with check (true);
