-- Migration: Add evaluation modes and multi-score support (Teoría/Práctica & Pre/Post)
-- 1. Add evaluacion_teorica_practica to catalogo_servicios (default false)
-- 2. Add multi-score columns (score_pre, score_post, score_teorica, score_practica, score_promedio, tipo_evaluacion)
--    to ejecucion_osi_participantes

-- 1. catalogo_servicios
ALTER TABLE catalogo_servicios
  ADD COLUMN IF NOT EXISTS evaluacion_teorica_practica BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN catalogo_servicios.evaluacion_teorica_practica IS
  'Indica si el curso requiere evaluación teórica y práctica por separado. La aprobación se calcula sobre el promedio. Default false.';

-- 2. ejecucion_osi_participantes
ALTER TABLE ejecucion_osi_participantes
  ADD COLUMN IF NOT EXISTS score_pre NUMERIC,
  ADD COLUMN IF NOT EXISTS score_post NUMERIC,
  ADD COLUMN IF NOT EXISTS score_teorica NUMERIC,
  ADD COLUMN IF NOT EXISTS score_practica NUMERIC,
  ADD COLUMN IF NOT EXISTS score_promedio NUMERIC,
  ADD COLUMN IF NOT EXISTS tipo_evaluacion VARCHAR(30) DEFAULT 'standard';

COMMENT ON COLUMN ejecucion_osi_participantes.score_pre IS
  'Calificación de pre-evaluación diagnóstica (0-20), utilizada en locaciones Planta y evaluaciones especiales.';

COMMENT ON COLUMN ejecucion_osi_participantes.score_post IS
  'Calificación de post-evaluación (0-20), base para la condición de aprobación en modo pre/post.';

COMMENT ON COLUMN ejecucion_osi_participantes.score_teorica IS
  'Calificación teórica (0-20) para cursos con evaluación teórica y práctica.';

COMMENT ON COLUMN ejecucion_osi_participantes.score_practica IS
  'Calificación práctica (0-20) para cursos con evaluación teórica y práctica.';

COMMENT ON COLUMN ejecucion_osi_participantes.score_promedio IS
  'Promedio calculado: en pre/post representa el promedio de aprendizaje; en teoría/práctica representa la nota final aprobatoria.';

COMMENT ON COLUMN ejecucion_osi_participantes.tipo_evaluacion IS
  'Modalidad de evaluación aplicada: standard, pre_post, o teoria_practica.';

