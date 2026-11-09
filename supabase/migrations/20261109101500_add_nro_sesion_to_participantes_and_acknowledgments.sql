-- Migration: Add nro_sesion to ejecucion_osi_participantes and facilitador_acknowledgments
-- Allows each session of a multi-session OSI to maintain its own independent participant list
-- and veracidad acknowledgment without overwriting other sessions.

-- 1. Add nro_sesion to ejecucion_osi_participantes (defaults to 1 for backwards compatibility)
ALTER TABLE ejecucion_osi_participantes
  ADD COLUMN IF NOT EXISTS nro_sesion INTEGER DEFAULT 1;

-- Backfill any existing rows to 1
UPDATE ejecucion_osi_participantes
  SET nro_sesion = 1
  WHERE nro_sesion IS NULL;

-- Index for session-scoped participant queries
CREATE INDEX IF NOT EXISTS idx_ejecucion_osi_participantes_session
  ON ejecucion_osi_participantes (osi_id, facilitador_id, nro_sesion);

-- 2. Add nro_sesion to facilitador_acknowledgments
ALTER TABLE facilitador_acknowledgments
  ADD COLUMN IF NOT EXISTS nro_sesion INTEGER DEFAULT 1;

UPDATE facilitador_acknowledgments
  SET nro_sesion = 1
  WHERE nro_sesion IS NULL;

-- Drop old unique constraint on (osi_id, facilitador_id) if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'facilitador_acknowledgments_osi_id_facilitador_id_key'
      AND table_name = 'facilitador_acknowledgments'
  ) THEN
    ALTER TABLE facilitador_acknowledgments
      DROP CONSTRAINT facilitador_acknowledgments_osi_id_facilitador_id_key;
  END IF;
END $$;

-- Drop index if exists by name
DROP INDEX IF EXISTS idx_facilitador_acknowledgments_session_unique;

-- Create unique index per session acknowledgment
CREATE UNIQUE INDEX IF NOT EXISTS idx_facilitador_acknowledgments_session_unique
  ON facilitador_acknowledgments (osi_id, facilitador_id, COALESCE(nro_sesion, 1));

