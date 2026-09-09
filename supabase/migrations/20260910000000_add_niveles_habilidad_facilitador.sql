-- Add niveles_habilidad column to facilitadores.
-- Stores a JSON map of topic name -> skill level ("experto" | "intermedio" | "basico").
-- Keys should match entries in temas_cursos. Defaults to empty object so existing
-- facilitadores keep working without any backfill.

ALTER TABLE facilitadores
  ADD COLUMN IF NOT EXISTS niveles_habilidad jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN facilitadores.niveles_habilidad IS
  'Mapa de tema -> nivel de habilidad (experto | intermedio | basico). Claves deben coincidir con entradas de temas_cursos.';
