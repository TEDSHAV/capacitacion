-- Migration to add optional subtitulo_carnet column to plantillas_cursos table
-- This allows course templates to specify an independent subtitle for carnets
-- (e.g., "(40 hrs)" or "(8 HORAS)") distinct from the certificate subtitle.
-- If NULL, it falls back to the certificate subtitle or none.

ALTER TABLE plantillas_cursos
  ADD COLUMN IF NOT EXISTS subtitulo_carnet text;

COMMENT ON COLUMN plantillas_cursos.subtitulo_carnet IS
  'Subtítulo a mostrar en los carnets cuando se usa esta plantilla (ej. "(40 hrs)"). NULL = usar subtítulo del certificado o ninguno.';
