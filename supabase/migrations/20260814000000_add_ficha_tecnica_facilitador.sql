-- Add columns for the Facilitador Ficha Técnica feature.
-- All nullable on purpose: existing facilitadores keep working and the ficha
-- técnica PDF simply omits empty sections / photo when these are NULL.

ALTER TABLE facilitadores
  ADD COLUMN IF NOT EXISTS formacion_academica text,
  ADD COLUMN IF NOT EXISTS experiencia_laboral text,
  ADD COLUMN IF NOT EXISTS competencias_habilidades text,
  ADD COLUMN IF NOT EXISTS titulo_profesional text,
  ADD COLUMN IF NOT EXISTS foto_perfil_url text;

COMMENT ON COLUMN facilitadores.formacion_academica IS
  'HTML (TipTap) content for the "Formación Académica" section of the facilitador ficha técnica.';
COMMENT ON COLUMN facilitadores.experiencia_laboral IS
  'HTML (TipTap) content for the "Experiencia Laboral" section of the facilitador ficha técnica.';
COMMENT ON COLUMN facilitadores.competencias_habilidades IS
  'HTML (TipTap) content for the "Competencias y Habilidades" section of the facilitador ficha técnica.';
COMMENT ON COLUMN facilitadores.titulo_profesional IS
  'Título profesional a mostrar bajo el nombre en la ficha técnica (ej: "TSU Higiene y Seguridad Industrial").';
COMMENT ON COLUMN facilitadores.foto_perfil_url IS
  'URL pública (Supabase Storage, bucket facilitador-fotos) de la foto de perfil usada en la ficha técnica.';
