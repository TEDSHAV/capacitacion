-- Migration: 20260929200000_create_facilitador_compliance_documentos.sql
-- Module: capacitacion
-- Purpose: Store digital acknowledgments and physical delivery tracking for
-- the 3 mandatory regulatory/compliance documents required for every facilitador:
--   1. Identificación de Peligros y Evaluación de Riesgos (read-only, digital ack)
--   2. Notificación de Riesgos y Principios de Prevención (digital ack + physical delivery)
--   3. Política General de Actuación, Confidencialidad y Gestión Operativa (digital ack + physical delivery)

create table if not exists public.facilitador_compliance_documentos (
  id bigint generated always as identity primary key,
  facilitador_id bigint not null references public.facilitadores(id) on delete cascade,
  document_code text not null check (document_code in ('identificacion_peligros', 'notificacion_riesgos', 'politica_operativa')),
  document_title text not null,
  document_version text not null default '2026-01',
  acknowledged boolean not null default false,
  acknowledged_at timestamptz,
  signer_name text,
  signer_cedula text,
  ip_address text,
  user_agent text,
  fisico_entregado boolean not null default false,
  fisico_entregado_at timestamptz,
  fisico_entregado_recibido_por text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_facilitador_documento unique (facilitador_id, document_code)
);

-- Indexes for performance
create index if not exists idx_fac_compliance_fac_id on public.facilitador_compliance_documentos(facilitador_id);
create index if not exists idx_fac_compliance_doc_code on public.facilitador_compliance_documentos(document_code);
create index if not exists idx_fac_compliance_acknowledged on public.facilitador_compliance_documentos(acknowledged);
create index if not exists idx_fac_compliance_fisico on public.facilitador_compliance_documentos(fisico_entregado);

-- Enable RLS
alter table public.facilitador_compliance_documentos enable row level security;

-- Policy: authenticated users (administrators & staff) can read all records
create policy "Allow read facilitador compliance documents for authenticated users"
  on public.facilitador_compliance_documentos
  for select
  to authenticated
  using (true);

-- Policy: service role has full access
create policy "Allow all for service role on facilitador compliance documents"
  on public.facilitador_compliance_documentos
  for all
  to service_role
  using (true)
  with check (true);
