-- Add per-session tracking to course_satisfaction_surveys.
-- nro_sesion: which session the survey response belongs to (defaults to 1 for backwards compat).
-- This allows per-session survey QR codes and per-session step auto-marking.

ALTER TABLE course_satisfaction_surveys
  ADD COLUMN IF NOT EXISTS nro_sesion INTEGER NOT NULL DEFAULT 1;

-- Backfill existing surveys to session 1
UPDATE course_satisfaction_surveys SET nro_sesion = 1 WHERE nro_sesion IS NULL;

CREATE INDEX IF NOT EXISTS idx_course_satisfaction_surveys_osi_session
  ON course_satisfaction_surveys (id_osi, nro_sesion);
