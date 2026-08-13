-- Add per-plantilla certificate title.
-- Nullable on purpose: existing plantillas keep working and fall back to the
-- original course name (catalogo_servicios.nombre) when this column is NULL.
ALTER TABLE plantillas_cursos
  ADD COLUMN titulo_certificado text;

COMMENT ON COLUMN plantillas_cursos.titulo_certificado IS
  'Título a mostrar en los certificados cuando se usa esta plantilla. NULL = usar el nombre original del curso.';
