-- Migration: 20260915150000_create_v_facilitador_resumen.sql
-- Module: capacitacion
-- Purpose: A read-only view that summarizes each facilitador's profile,
-- location, course matrix (skill levels + per-topic satisfaction ratings),
-- RG-CAP-004 accreditation, and experience metrics in a single row.
--
-- Consumers:
--   - The "Resumen PDF" export in the capacitacion dashboard (gestion-de-
--     facilitadores) reads one row by id to render a one-page shareable
--     summary for the Negocios department.
--   - The external Negocios app (shares this Supabase project) can query
--     this view directly without going through the capacitacion app.
--
-- The rating logic mirrors getFacilitatorPoolAction (app/actions/
-- facilitators-pool.ts) so the numbers match the management UI:
--   - surveyAvg = (q1+q2+q3+q4+q5)/5 per course_satisfaction_surveys row
--   - facilitador <-> osi mapping = active facilitador_osi_assignments
--     UNION certificados (nro_osi, id_facilitador) fallback
--   - topic = trim(v_osi_lista.servicio), or 'General' when no match
--   - overall_rating = survey avg if any surveys, else facilitadores.calificacion
--     if > 0, else 0
--
-- topic_ratings only contains topics that have at least one survey.
-- Consumers merge it with facilitadores.temas_cursos + niveles_habilidad
-- to build the full course matrix (topics with no surveys show as
-- "Habilitado" / sin rating).

create or replace view public.v_facilitador_resumen as
with
osi_topic as (
  select
    id_osi,
    trim(servicio) as topic
  from public.v_osi_lista
  where id_osi is not null
    and servicio is not null
    and trim(servicio) <> ''
),
-- facilitador <-> osi mapping: active assignments + certificados fallback.
-- Matches getFacilitatorPoolAction (no is_active filter on the certificados
-- branch — every certificado with id_facilitador + nro_osi contributes).
osi_fac as (
  select distinct
    osi_id as id_osi,
    facilitador_id
  from public.facilitador_osi_assignments
  where is_active is true
    and osi_id is not null
    and facilitador_id is not null
  union
  select distinct
    nro_osi::bigint as id_osi,
    id_facilitador as facilitador_id
  from public.certificados
  where id_facilitador is not null
    and nro_osi is not null
),
survey_avg as (
  select
    id,
    id_osi,
    (q1 + q2 + q3 + q4 + q5) / 5.0 as avg_rating
  from public.course_satisfaction_surveys
),
fac_topic as (
  select
    of2.facilitador_id,
    coalesce(ot.topic, 'General') as topic,
    avg(sa.avg_rating) as avg_rating,
    count(*) as review_count,
    count(distinct sa.id_osi) as sessions_count
  from survey_avg sa
  join osi_fac of2 on of2.id_osi = sa.id_osi
  left join osi_topic ot on ot.id_osi = sa.id_osi
  group by of2.facilitador_id, coalesce(ot.topic, 'General')
),
fac_overall as (
  select
    of2.facilitador_id,
    avg(sa.avg_rating) as overall_rating,
    count(*) as review_count
  from survey_avg sa
  join osi_fac of2 on of2.id_osi = sa.id_osi
  group by of2.facilitador_id
),
fac_metrics as (
  select
    facilitador_id,
    count(distinct id_osi) as total_osis
  from osi_fac
  group by facilitador_id
),
fac_eval as (
  select distinct on (facilitador_id)
    facilitador_id,
    condicion_final as evaluacion_condicion,
    porcentaje_total as evaluacion_porcentaje,
    fecha_evaluacion as evaluacion_fecha
  from public.facilitador_evaluaciones
  order by facilitador_id, fecha_evaluacion desc
)
select
  f.id,
  f.nombre_apellido,
  f.titulo_profesional,
  f.foto_perfil_url,
  f.cedula,
  f.email,
  f.telefono,
  f.is_active,
  f.alcance,
  f.ano_ingreso,
  f.fecha_creacion,
  f.temas_cursos,
  f.niveles_habilidad,
  f.calificacion,
  cc.nombre_ciudad as ciudad_nombre,
  ce.nombre_estado as estado_nombre,
  fe.evaluacion_condicion,
  fe.evaluacion_porcentaje,
  fe.evaluacion_fecha,
  coalesce(fm.total_osis, 0) as total_osis,
  coalesce((
    select count(*) from public.certificados c where c.id_facilitador = f.id
  ), 0) as total_certificados,
  round(
    case
      when fo.review_count > 0 then fo.overall_rating
      when f.calificacion is not null and f.calificacion > 0 then f.calificacion
      else 0
    end::numeric,
    1
  ) as overall_rating,
  coalesce(fo.review_count, 0) as review_count,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'topic', ft.topic,
      'avg_rating', round(ft.avg_rating::numeric, 1),
      'review_count', ft.review_count,
      'sessions_count', ft.sessions_count
    ))
    from fac_topic ft
    where ft.facilitador_id = f.id
  ), '[]'::jsonb) as topic_ratings
from public.facilitadores f
left join public.cat_ciudades cc on cc.id = f.id_ciudad
left join public.cat_estados_venezuela ce on ce.id = f.id_estado_geografico
left join fac_metrics fm on fm.facilitador_id = f.id
left join fac_overall fo on fo.facilitador_id = f.id
left join fac_eval fe on fe.facilitador_id = f.id;

-- Respect the caller's RLS on the underlying tables (PG15+).
-- Both capacitacion and the external Negocios app query as authenticated
-- users; underlying tables already permit authenticated SELECT.
alter view public.v_facilitador_resumen set (security_invoker = true);

comment on view public.v_facilitador_resumen is
  'Resumen de facilitador para compartir con Negocios. topic_ratings solo incluye temas con encuestas; combinar con temas_cursos + niveles_habilidad para la matriz completa.';

comment on column public.v_facilitador_resumen.topic_ratings is
  'JSON array de {topic, avg_rating, review_count, sessions_count} para temas con encuestas. Temas sin encuestas no aparecen aqui; usar temas_cursos para la lista completa.';
