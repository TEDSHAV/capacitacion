-- Add anulación audit columns to certificados and carnets.
-- When a certificate is annulled (soft-deleted via is_active = false) we record
-- the reason (motivo_anulacion), who did it (anulado_por, auth.users id) and
-- when (fecha_anulacion). Carnets mirror the same columns so the cascade from
-- a certificate anulación keeps its own audit trail.
-- NULL values mean the row has not been annulled (still active or just
-- deactivated by other means).

ALTER TABLE certificados
  ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT NULL,
  ADD COLUMN IF NOT EXISTS anulado_por UUID NULL,
  ADD COLUMN IF NOT EXISTS fecha_anulacion TIMESTAMPTZ NULL;

ALTER TABLE carnets
  ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT NULL,
  ADD COLUMN IF NOT EXISTS anulado_por UUID NULL,
  ADD COLUMN IF NOT EXISTS fecha_anulacion TIMESTAMPTZ NULL;

COMMENT ON COLUMN certificados.motivo_anulacion IS
  'Motivo ingresado por el administrador al anular el certificado. NULL si el registro está activo o fue desactivado por otra vía.';
COMMENT ON COLUMN certificados.anulado_por IS
  'ID del usuario (auth.users) que anuló el certificado. NULL si no ha sido anulado.';
COMMENT ON COLUMN certificados.fecha_anulacion IS
  'Fecha y hora en que se anuló el certificado. NULL si no ha sido anulado.';

COMMENT ON COLUMN carnets.motivo_anulacion IS
  'Motivo ingresado al anular el carnet (cascada desde el certificado). NULL si está activo.';
COMMENT ON COLUMN carnets.anulado_por IS
  'ID del usuario (auth.users) que anuló el carnet. NULL si no ha sido anulado.';
COMMENT ON COLUMN carnets.fecha_anulacion IS
  'Fecha y hora en que se anuló el carnet. NULL si no ha sido anulado.';
