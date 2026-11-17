-- Add per-plantilla carnet title.
-- Nullable on purpose: existing plantillas keep working and fall back to titulo_certificado
-- or the original course name (catalogo_servicios.nombre) when this column is NULL.
ALTER TABLE plantillas_cursos
  ADD COLUMN IF NOT EXISTS titulo_carnet text;

COMMENT ON COLUMN plantillas_cursos.titulo_carnet IS
  'Título a mostrar en los carnets cuando se usa esta plantilla. NULL = usar titulo_certificado o el nombre original del curso.';
