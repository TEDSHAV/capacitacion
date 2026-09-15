-- Migration: 20260915120000_create_facilitador_entrevistas.sql
-- Module: capacitacion
-- Purpose: Facilitator candidate/prospect interviews (Formato de entrevista facilitador)

create table if not exists public.facilitador_entrevistas (
  id                                  bigint generated always as identity primary key,

  -- Datos del Aspirante
  nombre_apellido                     text not null,
  cedula                              text,
  telefono                            text,
  email                               text,
  direccion                           text,
  posee_vehiculo                      boolean default false,
  posee_laptop                        boolean default false,
  disponibilidad_viajar               boolean default false,

  -- 1. Nivel Educativo y Actualización
  nivel_tecnico                       text,
  universitario                       text,
  posee_especializacion               text,
  ultimo_curso_tiempo                 text check (ultimo_curso_tiempo in ('6_meses', '12_meses', 'mas_12_meses') or ultimo_curso_tiempo is null),
  ultimo_curso_descripcion            text,
  manejo_herramientas_audiovisuales   text check (manejo_herramientas_audiovisuales in ('totalmente', 'con_limitacion', 'en_aprendizaje', 'no_se_manejarlos') or manejo_herramientas_audiovisuales is null),

  -- Documentación Legal Vigente / Soportes (SI / NO)
  doc_resumen_curricular              boolean default false,
  doc_cedula_identidad                boolean default false,
  doc_soportes_resumen_curricular     boolean default false,
  doc_rif_actualizado                 boolean default false,
  doc_registro_inpsasel               boolean default false,
  doc_factura_fiscal                  boolean default false,
  doc_titulo_universitario            boolean default false,
  doc_declaracion_islr                boolean default false,
  doc_formacion_docente               boolean default false,
  doc_posee_laptop                    boolean default false,

  -- Preguntas de Desenvolvimiento y Competencias
  retos_facilitador                   text,
  logros_formacion                    text,
  caracteristica_esencial             text,
  ejemplo_liderazgo                   text,
  fortalezas                          text,
  debilidades                         text,
  motivo_trabajar_aqui                text,
  por_que_contratarte                 text,
  temas_capacidades                   jsonb default '[]'::jsonb,

  -- Evaluación de la Entrevista (Interviewer)
  fecha_entrevista                    date not null default current_date,
  entrevistado_por                    text,
  evaluacion_items                    jsonb default '[]'::jsonb,
  observaciones                       text,
  estatus                             text not null default 'pendiente' check (estatus in ('pendiente', 'aprobado', 'rechazado')),

  -- Promoción y Enlace a Facilitador
  facilitador_id                      bigint references public.facilitadores(id) on delete set null,
  promovido_at                        timestamptz,

  -- Metadata
  creado_por                          bigint references public.usuarios(id),
  created_at                          timestamptz not null default now(),
  updated_at                          timestamptz not null default now()
);

-- Indexes for high-performance dashboard queries
create index if not exists idx_fac_entrevistas_fecha on public.facilitador_entrevistas (fecha_entrevista desc);
create index if not exists idx_fac_entrevistas_estatus on public.facilitador_entrevistas (estatus);
create index if not exists idx_fac_entrevistas_facilitador_id on public.facilitador_entrevistas (facilitador_id);
create index if not exists idx_fac_entrevistas_nombre on public.facilitador_entrevistas (nombre_apellido);

-- RLS policies
alter table public.facilitador_entrevistas enable row level security;

create policy "fac_entrevistas_read" on public.facilitador_entrevistas
  for select to authenticated using (true);

create policy "fac_entrevistas_insert" on public.facilitador_entrevistas
  for insert to authenticated with check (true);

create policy "fac_entrevistas_update" on public.facilitador_entrevistas
  for update to authenticated using (true);

create policy "fac_entrevistas_delete" on public.facilitador_entrevistas
  for delete to authenticated using (true);

-- Trigger for automatic updated_at maintenance
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists fac_entrevistas_updated_at on public.facilitador_entrevistas;
create trigger fac_entrevistas_updated_at
  before update on public.facilitador_entrevistas
  for each row execute function public.set_updated_at();
