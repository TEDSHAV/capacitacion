-- Migration: ensure robust RLS policies for material didactico and sugerencias
-- Module: capacitacion
-- Purpose: Strict Least-Privilege Row Level Security (RLS)
--          - Materials: Read-only for authenticated users; modifications restricted to service_role (server actions).
--          - Suggestions: Read/Insert for authenticated users; status updates & deletions restricted to service_role (server actions).

-- ============================================================================
-- 1. Table: capacitacion_material_didactico
-- ============================================================================
ALTER TABLE IF EXISTS public.capacitacion_material_didactico ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON public.capacitacion_material_didactico;
DROP POLICY IF EXISTS "Allow full access to service_role" ON public.capacitacion_material_didactico;
DROP POLICY IF EXISTS "capacitacion_material_didactico_select" ON public.capacitacion_material_didactico;
DROP POLICY IF EXISTS "capacitacion_material_didactico_insert" ON public.capacitacion_material_didactico;
DROP POLICY IF EXISTS "capacitacion_material_didactico_update" ON public.capacitacion_material_didactico;
DROP POLICY IF EXISTS "capacitacion_material_didactico_delete" ON public.capacitacion_material_didactico;
DROP POLICY IF EXISTS "capacitacion_material_didactico_service_role" ON public.capacitacion_material_didactico;

-- Read: authenticated users can read materials
CREATE POLICY "capacitacion_material_didactico_select"
  ON public.capacitacion_material_didactico
  FOR SELECT
  TO authenticated
  USING (true);

-- Full management: restricted to service_role (Next.js Server Actions with createAdminClient)
-- This blocks any client-side unauthorized tampering/deletion from regular users/facilitators.
CREATE POLICY "capacitacion_material_didactico_service_role"
  ON public.capacitacion_material_didactico
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================================================
-- 2. Table: capacitacion_material_sugerencias
-- ============================================================================
ALTER TABLE IF EXISTS public.capacitacion_material_sugerencias ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON public.capacitacion_material_sugerencias;
DROP POLICY IF EXISTS "Allow insert access to authenticated users" ON public.capacitacion_material_sugerencias;
DROP POLICY IF EXISTS "Allow service_role full management" ON public.capacitacion_material_sugerencias;
DROP POLICY IF EXISTS "capacitacion_material_sugerencias_select" ON public.capacitacion_material_sugerencias;
DROP POLICY IF EXISTS "capacitacion_material_sugerencias_insert" ON public.capacitacion_material_sugerencias;
DROP POLICY IF EXISTS "capacitacion_material_sugerencias_update" ON public.capacitacion_material_sugerencias;
DROP POLICY IF EXISTS "capacitacion_material_sugerencias_delete" ON public.capacitacion_material_sugerencias;
DROP POLICY IF EXISTS "capacitacion_material_sugerencias_service_role" ON public.capacitacion_material_sugerencias;

-- Read: authenticated users can read suggestions
CREATE POLICY "capacitacion_material_sugerencias_select"
  ON public.capacitacion_material_sugerencias
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert: authenticated users (facilitators / staff sending feedback)
CREATE POLICY "capacitacion_material_sugerencias_insert"
  ON public.capacitacion_material_sugerencias
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Status changes (revisada/implementada) & deletions: strictly restricted to service_role (Admin Server Actions)
CREATE POLICY "capacitacion_material_sugerencias_service_role"
  ON public.capacitacion_material_sugerencias
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
