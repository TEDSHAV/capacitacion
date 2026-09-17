-- Migration: create_capacitacion_categorias_cursos and add categoria to catalogo_servicios
-- Enables automanageable course categories (FG, TI, TP, CO, and custom categories)

-- 1. Create table for automanageable course categories
CREATE TABLE IF NOT EXISTS capacitacion_categorias_cursos (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(10) NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  color VARCHAR(30) NOT NULL DEFAULT 'sky',
  is_active BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE capacitacion_categorias_cursos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "capacitacion_categorias_cursos_select"
  ON capacitacion_categorias_cursos FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "capacitacion_categorias_cursos_modify"
  ON capacitacion_categorias_cursos FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION trg_capacitacion_categorias_cursos_up()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_capacitacion_categorias_cursos_up ON capacitacion_categorias_cursos;
CREATE TRIGGER trg_capacitacion_categorias_cursos_up
  BEFORE UPDATE ON capacitacion_categorias_cursos
  FOR EACH ROW
  EXECUTE FUNCTION trg_capacitacion_categorias_cursos_up();

-- Seed initial categories (FG, TI, TP, CO)
INSERT INTO capacitacion_categorias_cursos (codigo, nombre, descripcion, color, is_active, orden)
VALUES
  ('FG', 'Formación General', 'Cursos formativos básicos y normativos generales (inducciones, LOPCYMAT, etc.)', 'emerald', true, 1),
  ('TI', 'Técnico Industrial', 'Cursos técnicos orientados a la industria y procesos operacionales', 'sky', true, 2),
  ('TP', 'Técnico Profesional', 'Cursos técnicos especializados y competencias profesionales avanzadas', 'amber', true, 3),
  ('CO', 'Certificación Ocupacional', 'Cursos de certificación ocupacional y acreditación de operadores', 'purple', true, 4)
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  color = EXCLUDED.color,
  orden = EXCLUDED.orden;

-- 2. Add categoria column to catalogo_servicios (if not exists)
ALTER TABLE catalogo_servicios
  ADD COLUMN IF NOT EXISTS categoria TEXT;

COMMENT ON COLUMN catalogo_servicios.categoria IS
  'Código de categoría de capacitación (ej: FG, TI, TP, CO) correspondiente a capacitacion_categorias_cursos.codigo';
