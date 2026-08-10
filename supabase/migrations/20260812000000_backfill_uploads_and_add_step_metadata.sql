-- Backfill any remaining legacy uploads with nro_sesion = NULL → 1
-- (only affects rows uploaded before the nro_sesion column existed)
UPDATE ejecucion_osi_asistencia SET nro_sesion = 1 WHERE nro_sesion IS NULL;

-- Make nro_sesion NOT NULL on uploads (now that all are backfilled)
ALTER TABLE ejecucion_osi_asistencia ALTER COLUMN nro_sesion SET NOT NULL;
ALTER TABLE ejecucion_osi_asistencia ALTER COLUMN nro_sesion SET DEFAULT 1;

-- Add step_metadata JSONB column for structured per-step data
-- (e.g. {"guia": "12345"} for sobre_enviado_zoom, replacing freeform notes)
ALTER TABLE capacitacion_proceso_steps
  ADD COLUMN IF NOT EXISTS step_metadata JSONB DEFAULT '{}';

-- Migrate existing notes for sobre_enviado_zoom into step_metadata
UPDATE capacitacion_proceso_steps
  SET step_metadata = jsonb_build_object('guia', notes)
  WHERE step_key = 'sobre_enviado_zoom'
    AND notes IS NOT NULL
    AND notes != '';
