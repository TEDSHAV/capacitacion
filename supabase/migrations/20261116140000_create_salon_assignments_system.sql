-- 20261116140000_create_salon_assignments_system.sql
-- Static Classroom Assignment System for Capacitación:
-- Permanent classroom QR codes for Salón Principal, Salón Elite, and Salón Oriente.

CREATE TABLE IF NOT EXISTS public.capacitacion_salones_asignaciones (
  id SERIAL PRIMARY KEY,
  salon_id VARCHAR(50) NOT NULL, -- 'salon-principal', 'salon-elite', 'salon-oriente'
  id_osi INT NOT NULL REFERENCES public.ejecucion_osi(id) ON DELETE CASCADE,
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_salon_fecha UNIQUE (salon_id, fecha_inicio, id_osi)
);

CREATE INDEX IF NOT EXISTS idx_capacitacion_salones_asignaciones_active
  ON public.capacitacion_salones_asignaciones(salon_id, is_active, fecha_inicio, fecha_fin);

-- RLS
ALTER TABLE public.capacitacion_salones_asignaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "salones_service_role_all" ON public.capacitacion_salones_asignaciones;
CREATE POLICY "salones_service_role_all"
  ON public.capacitacion_salones_asignaciones
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "salones_auth_select" ON public.capacitacion_salones_asignaciones;
CREATE POLICY "salones_auth_select"
  ON public.capacitacion_salones_asignaciones
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "salones_anon_select" ON public.capacitacion_salones_asignaciones;
CREATE POLICY "salones_anon_select"
  ON public.capacitacion_salones_asignaciones
  FOR SELECT TO anon
  USING (true);
