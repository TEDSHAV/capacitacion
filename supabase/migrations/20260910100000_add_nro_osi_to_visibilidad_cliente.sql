-- Add nro_osi column to osi_visibilidad_cliente for orphan certificate batches
-- (certificates with nro_osi values that don't correspond to any ejecucion_osi row).
--
-- Existing rows keep their osi_id values; new orphan rows use nro_osi instead.
-- The CHECK constraint ensures exactly one identifier is always set.

-- Make osi_id nullable (orphan batches have no ejecucion_osi row)
ALTER TABLE osi_visibilidad_cliente ALTER COLUMN osi_id DROP NOT NULL;

-- Add nro_osi column for orphan certificate batches
ALTER TABLE osi_visibilidad_cliente ADD COLUMN nro_osi integer;

-- Ensure at least one identifier is set (osi_id for normal OSIs, nro_osi for orphans)
ALTER TABLE osi_visibilidad_cliente
  ADD CONSTRAINT osi_visibilidad_cliente_check_identifier
  CHECK ((osi_id IS NOT NULL) OR (nro_osi IS NOT NULL));

-- Prevent duplicate visibility rows for the same orphan nro_osi
CREATE UNIQUE INDEX osi_visibilidad_cliente_nro_osi_uniq
  ON osi_visibilidad_cliente (nro_osi)
  WHERE nro_osi IS NOT NULL;
