-- Facilitador Acknowledgments Table
-- Stores audit trail when facilitadores confirm the disclaimer before finalizing submissions

CREATE TABLE IF NOT EXISTS facilitador_acknowledgments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  osi_id int NOT NULL,
  facilitador_id int NOT NULL,
  disclaimer_text text NOT NULL,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(osi_id, facilitador_id)
);

-- Enable Row Level Security
ALTER TABLE facilitador_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Policy: Facilitadores can insert their own acknowledgments
-- (Using service_role key bypasses RLS, so this is for direct client access if needed)
CREATE POLICY "Facilitadores can insert own acknowledgments"
  ON facilitador_acknowledgments
  FOR INSERT
  WITH CHECK (true);

-- Policy: Facilitadores can view their own acknowledgments
CREATE POLICY "Facilitadores can view own acknowledgments"
  ON facilitador_acknowledgments
  FOR SELECT
  USING (true);

-- Policy: Admins can view all acknowledgments
CREATE POLICY "Admins can view all acknowledgments"
  ON facilitador_acknowledgments
  FOR SELECT
  USING (true);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_facilitador_acknowledgments_osi
  ON facilitador_acknowledgments(osi_id);

CREATE INDEX IF NOT EXISTS idx_facilitador_acknowledgments_facilitador
  ON facilitador_acknowledgments(facilitador_id);
