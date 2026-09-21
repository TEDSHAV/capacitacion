-- Migration: add mostrar_en_catalogo to catalogo_servicios
-- Controls whether a course appears in the course selection catalog for facilitators (gestion-facilitadores, entrevista-facilitadores)

ALTER TABLE catalogo_servicios
  ADD COLUMN IF NOT EXISTS mostrar_en_catalogo BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN catalogo_servicios.mostrar_en_catalogo IS
  'Indica si el curso está visible en el catálogo de cursos disponibles para facilitadores (gestion-facilitadores, entrevista-facilitadores). Default true para retrocompatibilidad.';
