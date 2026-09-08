-- Append-only log of notes/observations for OSIs.
-- Tracks why an OSI slipped, delays, or other contextual information.
-- Multiple entries per OSI are allowed; newest first when displayed.

CREATE TABLE IF NOT EXISTS capacitacion_osi_notas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  osi_id INTEGER NOT NULL,
  nota TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  CONSTRAINT capacitacion_osi_notas_osi_fkey
    FOREIGN KEY (osi_id) REFERENCES ejecucion_osi(id) ON DELETE CASCADE
);

CREATE INDEX idx_capacitacion_osi_notas_osi
  ON capacitacion_osi_notas (osi_id, created_at DESC);

ALTER TABLE capacitacion_osi_notas
  ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read
CREATE POLICY "capacitacion_osi_notas_select"
  ON capacitacion_osi_notas FOR SELECT
  TO authenticated USING (true);

-- Policy: authenticated users can insert/update/delete
CREATE POLICY "capacitacion_osi_notas_modify"
  ON capacitacion_osi_notas FOR ALL
  TO authenticated USING (true) WITH CHECK (true);
