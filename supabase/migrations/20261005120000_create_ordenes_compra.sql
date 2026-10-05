-- Migration: 20261005120000_create_ordenes_compra.sql
-- Module: capacitacion
-- Purpose: Dedicated table for Purchase Orders (Órdenes de Compra) consigned by
-- Administración/Compras for training services (OSIs) and assigned facilitadores.

create table if not exists public.ordenes_compra (
  id uuid primary key default gen_random_uuid(),
  po_number varchar(100) not null,
  osi_id bigint references public.ejecucion_osi(id) on delete cascade,
  facilitador_id bigint references public.facilitadores(id) on delete set null,
  fecha_emision date not null default current_date,
  monto numeric(14, 2),
  moneda varchar(10) not null default 'USD',
  estatus varchar(50) not null default 'pendiente_factura'
    check (estatus in ('pendiente_factura', 'factura_enviada', 'pagada', 'anulada')),
  observaciones text,
  file_name varchar(255) not null,
  file_type varchar(100) not null default 'application/pdf',
  file_size bigint,
  storage_provider varchar(50) not null default 'supabase'
    check (storage_provider in ('supabase', 'b2')),
  storage_path text not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_by_nombre varchar(255),
  uploaded_by_departamento varchar(100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for efficient queries
create index if not exists idx_ordenes_compra_osi_id on public.ordenes_compra(osi_id);
create index if not exists idx_ordenes_compra_facilitador_id on public.ordenes_compra(facilitador_id);
create index if not exists idx_ordenes_compra_po_number on public.ordenes_compra(po_number);
create index if not exists idx_ordenes_compra_estatus on public.ordenes_compra(estatus);
create index if not exists idx_ordenes_compra_created_at on public.ordenes_compra(created_at desc);

-- Enable RLS
alter table public.ordenes_compra enable row level security;

-- Policy: authenticated users can read purchase orders
create policy "Allow read ordenes_compra for authenticated users"
  on public.ordenes_compra
  for select
  to authenticated
  using (true);

-- Policy: authenticated users can insert purchase orders
create policy "Allow insert ordenes_compra for authenticated users"
  on public.ordenes_compra
  for insert
  to authenticated
  with check (true);

-- Policy: service role has full access
create policy "Allow all for service role on ordenes_compra"
  on public.ordenes_compra
  for all
  to service_role
  using (true)
  with check (true);
