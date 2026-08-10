-- Add per-session facilitador assignments and session-aware uploads.
-- nro_sesion on facilitador_osi_assignments: NULL = all sessions, 1..N = specific session.
-- nro_sesion on ejecucion_osi_asistencia: which session the uploaded file belongs to.

-- 1. facilitador_osi_assignments: add nro_sesion (NULL = all sessions)
ALTER TABLE facilitador_osi_assignments
  ADD COLUMN IF NOT EXISTS nro_sesion INTEGER;

-- Drop the old unique constraint on (osi_id, facilitador_id) that prevented
-- the same facilitador from being assigned to multiple sessions of the same OSI.
-- The new partial unique index below replaces it with per-session uniqueness.
DO $$
BEGIN
  -- Drop the constraint if it exists (name may vary by environment)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'facilitador_osi_assignments_osi_id_facilitador_id_key'
      AND table_name = 'facilitador_osi_assignments'
  ) THEN
    ALTER TABLE facilitador_osi_assignments
      DROP CONSTRAINT facilitador_osi_assignments_osi_id_facilitador_id_key;
  END IF;
END $$;

-- Also drop any unique index on (osi_id, facilitador_id) that might exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'facilitador_osi_assignments_osi_id_facilitador_id_key'
      AND tablename = 'facilitador_osi_assignments'
  ) THEN
    DROP INDEX facilitador_osi_assignments_osi_id_facilitador_id_key;
  END IF;
END $$;

-- Allow multiple active assignments per OSI (one facilitador per session, or one for all).
-- The unique partial index prevents duplicate active assignments for the same (osi, session) slot.
-- COALESCE(nro_sesion, -1) treats NULL as a distinct sentinel so "all sessions" is its own slot.
CREATE UNIQUE INDEX IF NOT EXISTS idx_facilitador_osi_assignments_unique
  ON facilitador_osi_assignments (osi_id, COALESCE(nro_sesion, -1))
  WHERE is_active = true;

-- 2. ejecucion_osi_asistencia: add nro_sesion (which session the file belongs to)
ALTER TABLE ejecucion_osi_asistencia
  ADD COLUMN IF NOT EXISTS nro_sesion INTEGER;

-- Backfill: existing uploads predate per-session tracking → default to session 1
UPDATE ejecucion_osi_asistencia SET nro_sesion = 1 WHERE nro_sesion IS NULL;

