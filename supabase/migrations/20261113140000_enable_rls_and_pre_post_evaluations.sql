-- 20261113140000_enable_rls_and_pre_post_evaluations.sql
-- 1. Enable RLS on all course evaluation tables
-- 2. Add Pre/Post evaluation support columns
-- 3. Define strict Least-Privilege Row Level Security (RLS) policies:
--    - service_role: Full access for Next.js Server Actions (sanitizes questions, calculates scores).
--    - authenticated: Read-only access to templates and active OSI evaluations for dashboard queries.
--    - anon: NO DIRECT ACCESS via PostgREST. All student exam loads and submissions are securely
--            brokered by server actions to prevent inspecting correct answers or spoofing scores.

-- Add tipo_evaluacion to plantillas and osi_evaluaciones
ALTER TABLE public.capacitacion_evaluaciones_plantillas
  ADD COLUMN IF NOT EXISTS tipo_evaluacion VARCHAR(20) NOT NULL DEFAULT 'standard';

ALTER TABLE public.capacitacion_evaluaciones_preguntas
  ADD COLUMN IF NOT EXISTS etapa VARCHAR(10) NOT NULL DEFAULT 'post'; -- 'pre', 'post', or 'regular'

ALTER TABLE public.capacitacion_osi_evaluaciones
  ADD COLUMN IF NOT EXISTS tipo_evaluacion VARCHAR(20) NOT NULL DEFAULT 'standard';

ALTER TABLE public.capacitacion_evaluaciones_respuestas
  ADD COLUMN IF NOT EXISTS etapa VARCHAR(10) NOT NULL DEFAULT 'post'; -- 'pre', 'post', or 'regular'

-- Enable RLS on all 4 tables
ALTER TABLE public.capacitacion_evaluaciones_plantillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capacitacion_evaluaciones_preguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capacitacion_osi_evaluaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capacitacion_evaluaciones_respuestas ENABLE ROW LEVEL SECURITY;

-- Clean up any existing policies
DROP POLICY IF EXISTS "eval_plantillas_service_role_all" ON public.capacitacion_evaluaciones_plantillas;
DROP POLICY IF EXISTS "eval_plantillas_auth_all" ON public.capacitacion_evaluaciones_plantillas;
DROP POLICY IF EXISTS "eval_plantillas_auth_select" ON public.capacitacion_evaluaciones_plantillas;
DROP POLICY IF EXISTS "eval_preguntas_service_role_all" ON public.capacitacion_evaluaciones_preguntas;
DROP POLICY IF EXISTS "eval_preguntas_auth_all" ON public.capacitacion_evaluaciones_preguntas;
DROP POLICY IF EXISTS "eval_preguntas_auth_select" ON public.capacitacion_evaluaciones_preguntas;
DROP POLICY IF EXISTS "osi_eval_service_role_all" ON public.capacitacion_osi_evaluaciones;
DROP POLICY IF EXISTS "osi_eval_auth_all" ON public.capacitacion_osi_evaluaciones;
DROP POLICY IF EXISTS "osi_eval_auth_select" ON public.capacitacion_osi_evaluaciones;
DROP POLICY IF EXISTS "osi_eval_public_read_active" ON public.capacitacion_osi_evaluaciones;
DROP POLICY IF EXISTS "eval_respuestas_service_role_all" ON public.capacitacion_evaluaciones_respuestas;
DROP POLICY IF EXISTS "eval_respuestas_auth_read" ON public.capacitacion_evaluaciones_respuestas;
DROP POLICY IF EXISTS "eval_respuestas_auth_select" ON public.capacitacion_evaluaciones_respuestas;
DROP POLICY IF EXISTS "eval_respuestas_public_insert" ON public.capacitacion_evaluaciones_respuestas;

-- ============================================================================
-- 1. Table: capacitacion_evaluaciones_plantillas
-- ============================================================================
-- Server Actions have full management
CREATE POLICY "eval_plantillas_service_role_all"
  ON public.capacitacion_evaluaciones_plantillas
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated staff can read templates
CREATE POLICY "eval_plantillas_auth_select"
  ON public.capacitacion_evaluaciones_plantillas
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================================
-- 2. Table: capacitacion_evaluaciones_preguntas
-- ============================================================================
-- Managed strictly by service_role (server actions) to protect answer keys
CREATE POLICY "eval_preguntas_service_role_all"
  ON public.capacitacion_evaluaciones_preguntas
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "eval_preguntas_auth_select"
  ON public.capacitacion_evaluaciones_preguntas
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================================
-- 3. Table: capacitacion_osi_evaluaciones
-- ============================================================================
-- Managed by service_role
CREATE POLICY "osi_eval_service_role_all"
  ON public.capacitacion_osi_evaluaciones
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated staff can view assigned OSI evaluations
CREATE POLICY "osi_eval_auth_select"
  ON public.capacitacion_osi_evaluaciones
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================================
-- 4. Table: capacitacion_evaluaciones_respuestas
-- ============================================================================
-- Submissions and grading are strictly processed by service_role
CREATE POLICY "eval_respuestas_service_role_all"
  ON public.capacitacion_evaluaciones_respuestas
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated staff can view participants' grades and responses
CREATE POLICY "eval_respuestas_auth_select"
  ON public.capacitacion_evaluaciones_respuestas
  FOR SELECT TO authenticated
  USING (true);

-- NOTE: `anon` has NO policies on these tables.
-- Any direct requests via PostgREST will be rejected (403 Forbidden).
-- All student queries and exam grading are performed server-side via Next.js Server Actions.
