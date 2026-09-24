-- Migration: create capacitacion_material_didactico
-- Stores centralized course presentations, printable materials, guides, and evaluations
-- with Backblaze B2 keys and optimization metrics.

CREATE TABLE IF NOT EXISTS capacitacion_material_didactico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_curso INT REFERENCES catalogo_servicios(id) ON DELETE CASCADE,
  id_osi INT REFERENCES ejecucion_osi(id) ON DELETE CASCADE,
  tipo_material TEXT NOT NULL CHECK (
    tipo_material IN (
      'presentacion_pptx',
      'presentacion_pdf',
      'material_imprimible',
      'guia_participante',
      'guia_facilitador',
      'evaluacion',
      'otro'
    )
  ),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  archivo_nombre TEXT NOT NULL,
  b2_key TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  file_size_formatted TEXT NOT NULL DEFAULT '0 KB',
  mime_type TEXT,
  es_optimizado BOOLEAN DEFAULT false,
  tamano_original_bytes BIGINT,
  version INT DEFAULT 1,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_material_curso ON capacitacion_material_didactico(id_curso);
CREATE INDEX IF NOT EXISTS idx_material_osi ON capacitacion_material_didactico(id_osi);
CREATE INDEX IF NOT EXISTS idx_material_tipo ON capacitacion_material_didactico(tipo_material);

-- Comments
COMMENT ON TABLE capacitacion_material_didactico IS 'Almacena recursos digitales y materiales de apoyo (PPTX optimizados, PDFs, guías) para cursos y servicios de capacitación.';
COMMENT ON COLUMN capacitacion_material_didactico.b2_key IS 'Clave del objeto en el bucket Backblaze B2';
COMMENT ON COLUMN capacitacion_material_didactico.es_optimizado IS 'Indica si el archivo PPTX fue comprimido reduciendo sus medios internos';

-- Row Level Security (RLS)
ALTER TABLE capacitacion_material_didactico ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read materials
CREATE POLICY "Allow read access to authenticated users"
  ON capacitacion_material_didactico
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow service_role full management
CREATE POLICY "Allow full access to service_role"
  ON capacitacion_material_didactico
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

