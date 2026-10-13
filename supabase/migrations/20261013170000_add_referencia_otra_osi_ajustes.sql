-- Migration: 20261013170000_add_referencia_otra_osi_ajustes.sql
-- Module: capacitacion
-- Purpose: Add support for linking an OSI to another OSI where its certificates were actually issued,
-- for SLA (72h) compliance calculations and tracking.

alter table public.capacitacion_indicadores_ajustes
  add column if not exists osi_referencia_id bigint references public.ejecucion_osi(id) on delete set null,
  add column if not exists nro_osi_referencia text,
  add column if not exists emitido_en_otra_osi boolean not null default false;

create index if not exists idx_capacitacion_indicadores_ajustes_ref_osi
  on public.capacitacion_indicadores_ajustes(osi_referencia_id)
  where osi_referencia_id is not null;
