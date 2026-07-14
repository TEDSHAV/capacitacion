# Supabase Setup Instructions for Control Sequence Configuration

## Overview

This document outlines the Supabase changes needed to support control number sequence initialization from your legacy system.

## Required Changes

### 1. Create `control_sequences` Table

Execute the following SQL in your Supabase SQL Editor:

```sql
CREATE TABLE control_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nro_libro INTEGER NOT NULL CHECK (nro_libro >= 1),
  nro_hoja INTEGER NOT NULL CHECK (nro_hoja >= 1 AND nro_hoja <= 100),
  nro_linea INTEGER NOT NULL CHECK (nro_linea >= 1 AND nro_linea <= 10),
  nro_control BIGINT NOT NULL CHECK (nro_control >= 1),
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_by TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- IMPORTANT: Ensure the certificados table also uses BIGINT for nro_control
-- ALTER TABLE certificados ALTER COLUMN nro_control TYPE BIGINT;


-- Create index for active sequence lookup
CREATE INDEX idx_control_sequences_is_active ON control_sequences(is_active);

-- Enable RLS
ALTER TABLE control_sequences ENABLE ROW LEVEL SECURITY;

-- Create RLS policy (allow authenticated users to read, only admins to write)
CREATE POLICY "Allow authenticated users to read control sequences"
  ON control_sequences
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admins to manage control sequences"
  ON control_sequences
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

### 2. Update `get_next_control_numbers` RPC Function

If you have an existing `get_next_control_numbers` RPC function, ensure it handles the control_sequences table. The function should:

1. Check if `control_sequences` table has an active configuration
2. If no certificates exist yet, return the configured starting values
3. If certificates exist, calculate next numbers from the last certificate
4. Handle wrapping logic: 10 lines per sheet, 100 sheets per book

Here's a reference implementation:

```sql
CREATE OR REPLACE FUNCTION get_next_control_numbers(batch_size INTEGER DEFAULT 1)
RETURNS TABLE (
  nro_libro INTEGER,
  nro_hoja INTEGER,
  nro_linea INTEGER,
  nro_control BIGINT
) AS $$
DECLARE
  v_last_cert RECORD;
  v_config RECORD;
  v_cert_count INTEGER;
BEGIN
  -- Check if there's an active control sequence configuration
  SELECT * INTO v_config
  FROM control_sequences
  WHERE is_active = true
  LIMIT 1;

  -- Count existing certificates
  SELECT COUNT(*) INTO v_cert_count FROM certificados;

  -- If no certificates exist and config is set, use configured values
  IF v_cert_count = 0 AND v_config IS NOT NULL THEN
    RETURN QUERY SELECT
      v_config.nro_libro,
      v_config.nro_hoja,
      v_config.nro_linea,
      v_config.nro_control;
    RETURN;
  END IF;

  -- Get the last certificate
  SELECT nro_libro, nro_hoja, nro_linea, nro_control
  INTO v_last_cert
  FROM certificados
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no certificates exist, return defaults or configured values
  IF v_last_cert IS NULL THEN
    IF v_config IS NOT NULL THEN
      RETURN QUERY SELECT
        v_config.nro_libro,
        v_config.nro_hoja,
        v_config.nro_linea,
        v_config.nro_control;
    ELSE
      RETURN QUERY SELECT 1, 1, 1, 1::BIGINT;
    END IF;
    RETURN;
  END IF;

  -- Calculate next numbers based on last certificate
  RETURN QUERY SELECT
    CASE
      WHEN (v_last_cert.nro_linea + batch_size - 1) > 10 THEN
        CASE
          WHEN (v_last_cert.nro_hoja + FLOOR((v_last_cert.nro_linea + batch_size - 2) / 10.0)::INTEGER) > 100 THEN
            v_last_cert.nro_libro + FLOOR((v_last_cert.nro_hoja + FLOOR((v_last_cert.nro_linea + batch_size - 2) / 10.0)::INTEGER - 1) / 100.0)::INTEGER
          ELSE
            v_last_cert.nro_libro
        END
      ELSE
        v_last_cert.nro_libro
    END,
    CASE
      WHEN (v_last_cert.nro_linea + batch_size - 1) > 10 THEN
        ((v_last_cert.nro_hoja + FLOOR((v_last_cert.nro_linea + batch_size - 2) / 10.0)::INTEGER - 1) % 100) + 1
      ELSE
        v_last_cert.nro_hoja
    END,
    ((v_last_cert.nro_linea + batch_size - 1 - 1) % 10) + 1,
    v_last_cert.nro_control + 1;
END;
$$ LANGUAGE plpgsql;
```

### 3. Enable RLS on `control_sequences` Table

Make sure Row Level Security (RLS) is enabled and policies are set appropriately:

```sql
-- If not already done in step 1, enable RLS
ALTER TABLE control_sequences ENABLE ROW LEVEL SECURITY;

-- Verify policies exist
SELECT * FROM pg_policies WHERE tablename = 'control_sequences';
```

## Testing the Setup

1. **Create a test control sequence:**

   ```sql
   INSERT INTO control_sequences (nro_libro, nro_hoja, nro_linea, nro_control, is_active, notes)
   VALUES (378, 1, 1, 281201755304, true, 'Test configuration');
   ```

2. **Verify the configuration is retrievable:**

   ```sql
   SELECT * FROM control_sequences WHERE is_active = true;
   ```

3. **Test the RPC function:**
   ```sql
   SELECT * FROM get_next_control_numbers(1);
   ```

## Verification Checklist

- [ ] `control_sequences` table created
- [ ] RLS enabled on `control_sequences`
- [ ] RLS policies configured
- [ ] `get_next_control_numbers` RPC function updated or created
- [ ] Test configuration inserted and verified
- [ ] RPC function tested and returns expected values

## Notes

- The `control_sequences` table stores the initial sequence values
- Only one configuration can be active at a time (enforced by the application)
- Once certificates are generated, the sequence is determined by the last certificate
- The RPC function handles all the wrapping logic (10 lines/sheet, 100 sheets/book)
- All timestamps are in UTC (TIMESTAMP WITH TIME ZONE)

## Support

If you encounter any issues:

1. Check that the table exists: `SELECT * FROM control_sequences;`
2. Verify RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'control_sequences';`
3. Test the RPC function directly in the SQL editor
4. Check application logs for any error messages
