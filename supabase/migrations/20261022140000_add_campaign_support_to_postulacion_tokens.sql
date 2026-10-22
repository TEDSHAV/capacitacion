-- Migration: 20261022140000_add_campaign_support_to_postulacion_tokens.sql
-- Module: capacitacion
-- Purpose: Support for open recruitment campaigns and multi-use invitation tokens

alter table public.facilitador_postulacion_tokens
  add column if not exists tipo text not null default 'individual',
  add column if not exists titulo_campana text,
  add column if not exists max_usos integer,
  add column if not exists usos_count integer not null default 0;

-- Constraint on tipo
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'facilitador_postulacion_tokens_tipo_check'
  ) then
    alter table public.facilitador_postulacion_tokens
      add constraint facilitador_postulacion_tokens_tipo_check
      check (tipo in ('individual', 'campana'));
  end if;
end $$;

-- Index on tipo
create index if not exists idx_fac_postulacion_tokens_tipo on public.facilitador_postulacion_tokens (tipo);
