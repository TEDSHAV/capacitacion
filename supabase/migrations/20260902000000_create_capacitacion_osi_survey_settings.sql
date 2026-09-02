-- Dedicated table for per-OSI survey QR settings.
-- Stores whether an OSI uses a single QR for the whole OSI ('unique', default)
-- or one QR per session ('per_session'). Kept in its own table so the
-- ejecucion_osi table does not need to be modified.
-- 'unique': one QR for the OSI — surveys land on session 1.
-- 'per_session': one QR per session — surveys carry nro_sesion and auto-mark
--   the encuestas_satisfaccion_tabulacion process step for that session.

CREATE TABLE IF NOT EXISTS capacitacion_osi_survey_settings (
  osi_id INTEGER PRIMARY KEY,
  survey_mode TEXT NOT NULL DEFAULT 'unique'
    CHECK (survey_mode IN ('unique', 'per_session')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT capacitacion_osi_survey_settings_osi_fkey
    FOREIGN KEY (osi_id) REFERENCES ejecucion_osi(id) ON DELETE CASCADE
);

ALTER TABLE capacitacion_osi_survey_settings
  ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read (the capacitacion app is used by dept members)
CREATE POLICY "capacitacion_osi_survey_settings_select"
  ON capacitacion_osi_survey_settings FOR SELECT
  TO authenticated USING (true);

-- Policy: authenticated users can insert/update
CREATE POLICY "capacitacion_osi_survey_settings_modify"
  ON capacitacion_osi_survey_settings FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- Auto-refresh updated_at on change
CREATE OR REPLACE FUNCTION trg_capacitacion_osi_survey_settings_before_up()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_capacitacion_osi_survey_settings_before_up
  BEFORE INSERT OR UPDATE ON capacitacion_osi_survey_settings
  FOR EACH ROW
  EXECUTE FUNCTION trg_capacitacion_osi_survey_settings_before_up();
