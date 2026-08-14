-- Venezuelan holiday calendar for business-day SLA calculations.
-- Used by the Indicadores de Certificados module to count business days
-- (weekdays excluding holidays) between session execution and cert issuance.

CREATE TABLE IF NOT EXISTS cat_feriados_venezuela (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fecha DATE NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  es_nacional BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cat_feriados_venezuela ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read holidays (needed for indicadores calculations)
CREATE POLICY "Anyone authenticated can read feriados"
  ON cat_feriados_venezuela FOR SELECT TO authenticated USING (true);

-- Only admins/superadmins can manage holidays
CREATE POLICY "Only admins can insert feriados"
  ON cat_feriados_venezuela FOR INSERT TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));

CREATE POLICY "Only admins can update feriados"
  ON cat_feriados_venezuela FOR UPDATE TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));

CREATE POLICY "Only admins can delete feriados"
  ON cat_feriados_venezuela FOR DELETE TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));

-- Seed Venezuelan national holidays for 2025-2026.
-- These are the standard national holidays; regional/decreed holidays
-- can be added via the admin page at /dashboard/capacitacion/configuracion/feriados.
INSERT INTO cat_feriados_venezuela (fecha, nombre, es_nacional) VALUES
  ('2025-01-01', 'Año Nuevo', true),
  ('2025-03-03', 'Lunes Carnaval', true),
  ('2025-03-04', 'Martes Carnaval', true),
  ('2025-04-18', 'Viernes Santo', true),
  ('2025-04-19', 'Declaración de Independencia', true),
  ('2025-05-01', 'Día del Trabajador', true),
  ('2025-06-24', 'Batalla de Carabobo', true),
  ('2025-07-05', 'Día de la Independencia', true),
  ('2025-07-24', 'Natalicio de Simón Bolívar', true),
  ('2025-10-12', 'Día de la Resistencia Indígena', true),
  ('2025-12-24', 'Víspera de Navidad', true),
  ('2025-12-25', 'Navidad', true),
  ('2025-12-31', 'Fin de Año', true),
  ('2026-01-01', 'Año Nuevo', true),
  ('2026-02-09', 'Lunes Carnaval', true),
  ('2026-02-10', 'Martes Carnaval', true),
  ('2026-04-03', 'Viernes Santo', true),
  ('2026-04-19', 'Declaración de Independencia', true),
  ('2026-05-01', 'Día del Trabajador', true),
  ('2026-06-24', 'Batalla de Carabobo', true),
  ('2026-07-05', 'Día de la Independencia', true),
  ('2026-07-24', 'Natalicio de Simón Bolívar', true),
  ('2026-10-12', 'Día de la Resistencia Indígena', true),
  ('2026-12-24', 'Víspera de Navidad', true),
  ('2026-12-25', 'Navidad', true),
  ('2026-12-31', 'Fin de Año', true)
ON CONFLICT (fecha) DO NOTHING;
