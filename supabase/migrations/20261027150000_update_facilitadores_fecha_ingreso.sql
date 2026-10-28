-- Update hiring dates (fecha_ingreso) and location for recently hired facilitators
-- and link their corresponding interview records.

UPDATE public.facilitadores
SET
  fecha_ingreso = '2026-10-22',
  ano_ingreso = 2026,
  id_estado_geografico = COALESCE(id_estado_geografico, 24),
  id_ciudad = COALESCE(id_ciudad, 57),
  fecha_actualizacion = NOW()
WHERE id = 64 OR LOWER(nombre_apellido) = 'gustavo linares';

UPDATE public.facilitadores
SET
  fecha_ingreso = '2026-08-08',
  ano_ingreso = 2026,
  id_estado_geografico = COALESCE(id_estado_geografico, 4),
  id_ciudad = COALESCE(id_ciudad, 13),
  fecha_actualizacion = NOW()
WHERE id = 57 OR LOWER(nombre_apellido) = 'andrea marciano';

UPDATE public.facilitadores
SET
  fecha_ingreso = '2026-08-10',
  ano_ingreso = 2026,
  id_estado_geografico = COALESCE(id_estado_geografico, 4),
  id_ciudad = COALESCE(id_ciudad, 13),
  fecha_actualizacion = NOW()
WHERE id = 65 OR LOWER(nombre_apellido) = 'rafael maldonado';

-- Link approved interviews to their promoted facilitator records
UPDATE public.facilitador_entrevistas
SET
  facilitador_id = 57,
  promovido_at = COALESCE(promovido_at, '2026-08-08T12:00:00Z')
WHERE id = 7 AND facilitador_id IS NULL;

UPDATE public.facilitador_entrevistas
SET
  facilitador_id = 64,
  promovido_at = COALESCE(promovido_at, '2026-10-22T12:00:00Z')
WHERE id = 9 AND facilitador_id IS NULL;

UPDATE public.facilitador_entrevistas
SET
  facilitador_id = 65,
  promovido_at = COALESCE(promovido_at, '2026-08-10T12:00:00Z')
WHERE id = 11 AND facilitador_id IS NULL;
