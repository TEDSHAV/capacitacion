-- Standardize phone numbers (always starting with 0) and normalize casing
-- for facilitadores and facilitador_entrevistas.

UPDATE public.facilitadores
SET telefono = '0' || REGEXP_REPLACE(telefono, '\D', '', 'g')
WHERE telefono IS NOT NULL
  AND LENGTH(REGEXP_REPLACE(telefono, '\D', '', 'g')) = 10
  AND LEFT(REGEXP_REPLACE(telefono, '\D', '', 'g'), 1) IN ('4', '2');

UPDATE public.facilitadores
SET telefono = '0' || SUBSTRING(REGEXP_REPLACE(telefono, '\D', '', 'g') FROM 3)
WHERE telefono IS NOT NULL
  AND LENGTH(REGEXP_REPLACE(telefono, '\D', '', 'g')) = 12
  AND LEFT(REGEXP_REPLACE(telefono, '\D', '', 'g'), 2) = '58';

UPDATE public.facilitador_entrevistas
SET telefono = '0' || REGEXP_REPLACE(telefono, '\D', '', 'g')
WHERE telefono IS NOT NULL
  AND LENGTH(REGEXP_REPLACE(telefono, '\D', '', 'g')) = 10
  AND LEFT(REGEXP_REPLACE(telefono, '\D', '', 'g'), 1) IN ('4', '2');

UPDATE public.facilitador_entrevistas
SET telefono = '0' || SUBSTRING(REGEXP_REPLACE(telefono, '\D', '', 'g') FROM 3)
WHERE telefono IS NOT NULL
  AND LENGTH(REGEXP_REPLACE(telefono, '\D', '', 'g')) = 12
  AND LEFT(REGEXP_REPLACE(telefono, '\D', '', 'g'), 2) = '58';

-- Standardize cedula in facilitador_entrevistas ONLY (does not touch certificados or carnets)
UPDATE public.facilitador_entrevistas
SET cedula = CASE
  WHEN cedula ~* '^\s*e' THEN 'E-' || REGEXP_REPLACE(cedula, '\D', '', 'g')
  ELSE 'V-' || REGEXP_REPLACE(cedula, '\D', '', 'g')
END
WHERE cedula IS NOT NULL
  AND LENGTH(REGEXP_REPLACE(cedula, '\D', '', 'g')) > 0;

