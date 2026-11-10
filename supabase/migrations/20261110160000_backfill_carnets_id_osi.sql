-- Migration: Backfill carnets.id_osi for orphan carnets
-- Resolves carnets where id_osi IS NULL but the associated certificate has a matching nro_osi in ejecucion_osi

UPDATE carnets
SET id_osi = eo.id
FROM certificados c
JOIN ejecucion_osi eo 
  ON regexp_replace(COALESCE(c.nro_osi::text, ''), '\D', '', 'g') = eo.nro_osi_secuencial
WHERE carnets.id_certificado = c.id
  AND carnets.id_osi IS NULL
  AND c.nro_osi IS NOT NULL
  AND eo.id IS NOT NULL;

