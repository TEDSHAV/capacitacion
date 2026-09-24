-- Migration: enhance capacitacion_material_didactico with visibility, versioning and suggestions
-- Adds visibility control for facilitators, parent material linking for version history,
-- and a dedicated feedback/suggestion table for facilitators.

ALTER TABLE capacitacion_material_didactico
  ADD COLUMN IF NOT EXISTS visible_facilitador BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_latest BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS parent_material_id UUID REFERENCES capacitacion_material_didactico(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_material_visible ON capacitacion_material_didactico(visible_facilitador);
CREATE INDEX IF NOT EXISTS idx_material_parent ON capacitacion_material_didactico(parent_material_id);
CREATE INDEX IF NOT EXISTS idx_material_is_latest ON capacitacion_material_didactico(is_latest);

COMMENT ON COLUMN capacitacion_material_didactico.visible_facilitador IS 'Define si el recurso digital está habilitado para descarga y visualización en el Portal del Facilitador.';
COMMENT ON COLUMN capacitacion_material_didactico.is_latest IS 'Indica si es la versión activa actual del recurso.';

-- Table for facilitator feedback & suggestions specifically on presentation/materials
CREATE TABLE IF NOT EXISTS capacitacion_material_sugerencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_material UUID NOT NULL REFERENCES capacitacion_material_didactico(id) ON DELETE CASCADE,
  id_curso INT REFERENCES catalogo_servicios(id) ON DELETE CASCADE,
  id_osi INT REFERENCES ejecucion_osi(id) ON DELETE SET NULL,
  facilitador_id INT REFERENCES facilitadores(id) ON DELETE SET NULL,
  facilitador_nombre TEXT NOT NULL,
  diapositiva_nro INT,
  tipo_sugerencia TEXT NOT NULL DEFAULT 'mejora' CHECK (
    tipo_sugerencia IN ('mejora', 'error_contenido', 'mejora_visual', 'actualizacion_norma', 'otro')
  ),
  comentario TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (
    estado IN ('pendiente', 'revisada', 'implementada', 'descartada')
  ),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sugerencias_material ON capacitacion_material_sugerencias(id_material);
CREATE INDEX IF NOT EXISTS idx_sugerencias_curso ON capacitacion_material_sugerencias(id_curso);
CREATE INDEX IF NOT EXISTS idx_sugerencias_estado ON capacitacion_material_sugerencias(estado);

COMMENT ON TABLE capacitacion_material_sugerencias IS 'Buzón de sugerencias y observaciones de facilitadores sobre presentaciones y material didáctico.';

-- Enable RLS
ALTER TABLE capacitacion_material_sugerencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to authenticated users"
  ON capacitacion_material_sugerencias
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert access to authenticated users"
  ON capacitacion_material_sugerencias
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update access to authenticated users"
  ON capacitacion_material_sugerencias
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete access to authenticated users"
  ON capacitacion_material_sugerencias
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow service_role full management"
  ON capacitacion_material_sugerencias
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
