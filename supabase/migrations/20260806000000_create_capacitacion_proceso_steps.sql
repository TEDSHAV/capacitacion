-- Capacitacion proceso steps tracker
-- Tracks per-OSI, per-session step completion for Planificacion (2 steps) and
-- Ejecucion (11 steps) phases. Step definitions are in code constants
-- (lib/proceso-steps.ts); this table only stores the completion state.
-- Rows are seeded lazily by ensureProcesoStepsExist().
-- nro_sesion defaults to 1 for single-session OSIs.

CREATE TABLE IF NOT EXISTS capacitacion_proceso_steps (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  osi_id INTEGER NOT NULL,
  nro_sesion INTEGER NOT NULL DEFAULT 1,
  phase TEXT NOT NULL CHECK (phase IN ('planificacion', 'ejecucion')),
  step_key TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (osi_id, nro_sesion, phase, step_key),
  -- Enforce: if completed is true, completed_at must not be null
  CONSTRAINT completed_requires_timestamp CHECK (
    NOT (completed = true AND completed_at IS NULL)
  )
);

CREATE INDEX idx_capacitacion_proceso_steps_osi
  ON capacitacion_proceso_steps (osi_id, phase, nro_sesion);

ALTER TABLE capacitacion_proceso_steps
  ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read (the capacitacion app is used by dept members)
CREATE POLICY "capacitacion_steps_select"
  ON capacitacion_proceso_steps FOR SELECT
  TO authenticated USING (true);

-- Policy: authenticated users can insert/update/delete
CREATE POLICY "capacitacion_steps_modify"
  ON capacitacion_proceso_steps FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- Combined trigger: updated_at + auto-set/clear completed_at
-- - Always refresh updated_at
-- - Auto-set completed_at = now() when completed flips to true and app didn't set it
-- - Clear completed_at when completed is false
-- Note: completed_by is intentionally NOT auto-set here. The app sets it for user
-- toggles and leaves it null for system auto-advances (to distinguish the two).
CREATE OR REPLACE FUNCTION trg_capacitacion_proceso_steps_before_up()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.completed = true AND NEW.completed_at IS NULL THEN
    NEW.completed_at = now();
  END IF;
  IF NEW.completed = false THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_capacitacion_proceso_steps_before_up
  BEFORE INSERT OR UPDATE ON capacitacion_proceso_steps
  FOR EACH ROW
  EXECUTE FUNCTION trg_capacitacion_proceso_steps_before_up();
