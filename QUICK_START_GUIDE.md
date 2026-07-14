# Quick Start Guide - Control Number Sequence Configuration

## For You (Supabase Setup)

### Step 1: Create the Table
Go to your Supabase SQL Editor and run:

```sql
CREATE TABLE control_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nro_libro INTEGER NOT NULL CHECK (nro_libro >= 1),
  nro_hoja INTEGER NOT NULL CHECK (nro_hoja >= 1 AND nro_hoja <= 100),
  nro_linea INTEGER NOT NULL CHECK (nro_linea >= 1 AND nro_linea <= 10),
  nro_control INTEGER NOT NULL CHECK (nro_control >= 1),
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_by TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_control_sequences_is_active ON control_sequences(is_active);

ALTER TABLE control_sequences ENABLE ROW LEVEL SECURITY;

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

### Step 2: Update or Create RPC Function
See `SUPABASE_SETUP_INSTRUCTIONS.md` for the complete RPC function code.

The function should:
- Check `control_sequences` table for active config
- Return configured values if no certificates exist
- Calculate next numbers from last certificate if they do exist

### Step 3: Verify
Run this query to test:
```sql
SELECT * FROM control_sequences;
```

You should get an empty result (no rows yet).

---

## For Your Users (Using the Feature)

### First Time Setup
1. Go to `/dashboard/capacitacion/configuracion/secuencias-control`
2. You'll see a form with pre-filled values:
   - Libro: 378
   - Hoja: 1
   - Línea: 1
   - Nro. Control: 281201755304
3. Click "Guardar Configuración"
4. You'll see a green banner showing the active configuration
5. Now you're ready to generate certificates!

### Generating Certificates
1. Go to `/dashboard/capacitacion/generacion-certificado`
2. Fill in the certificate details as usual
3. Click "Generar Certificados"
4. The first certificate will automatically use your configured numbers
5. Each subsequent certificate increments the sequence

### What Happens After First Certificate
- The configuration page becomes read-only
- You'll see an amber banner: "Certificados ya generados"
- Control numbers are now calculated automatically from the last certificate
- The sequence continues seamlessly

---

## Testing the Setup

### Test 1: Configuration Storage
```sql
-- Insert a test configuration
INSERT INTO control_sequences (nro_libro, nro_hoja, nro_linea, nro_control, is_active, notes)
VALUES (378, 1, 1, 281201755304, true, 'Test configuration');

-- Verify it was saved
SELECT * FROM control_sequences WHERE is_active = true;
```

### Test 2: RPC Function
```sql
-- Test the RPC function
SELECT * FROM get_next_control_numbers(1);
```

Expected output (if no certificates exist):
```
nro_libro | nro_hoja | nro_linea | nro_control
----------|----------|----------|-------------
378       | 1        | 1        | 281201755304
```

### Test 3: Full Flow
1. Create configuration via admin UI
2. Generate one certificate
3. Check database: `SELECT nro_libro, nro_hoja, nro_linea, nro_control FROM certificados ORDER BY created_at DESC LIMIT 1;`
4. Should show: 378, 1, 1, 281201755304
5. Generate another certificate
6. Check database again
7. Should show: 378, 1, 2, 281201755305

---

## Troubleshooting

### "Cannot set control sequence after certificates have been generated"
**Cause**: You already have certificates in the database
**Solution**: This is expected behavior. The configuration is locked to prevent conflicts.

### Configuration form not appearing
**Cause**: Table doesn't exist or RLS policies are blocking access
**Solution**: 
1. Verify table exists: `SELECT * FROM control_sequences;`
2. Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'control_sequences';`

### Certificates not using configured values
**Cause**: Configuration not saved or RPC not updated
**Solution**:
1. Check active config: `SELECT * FROM control_sequences WHERE is_active = true;`
2. Verify RPC function exists and is updated
3. Check application logs for errors

### Control numbers not incrementing correctly
**Cause**: RPC function wrapping logic incorrect
**Solution**: Review the RPC function in `SUPABASE_SETUP_INSTRUCTIONS.md` and ensure it matches the wrapping rules:
- 10 lines per sheet
- 100 sheets per book

---

## Key Points to Remember

✅ **Do this first**: Create the table and RPC function in Supabase
✅ **One-time setup**: Configuration can only be set once (before first certificate)
✅ **Automatic after**: Once configured, control numbers increment automatically
✅ **Backward compatible**: If no configuration exists, system uses defaults
✅ **Audit trail**: All configurations are logged with timestamps

---

## Need Help?

1. Check `IMPLEMENTATION_SUMMARY.md` for detailed architecture
2. Check `SUPABASE_SETUP_INSTRUCTIONS.md` for SQL scripts
3. Review the form component: `app/dashboard/capacitacion/configuracion/secuencias-control/components/SequenceConfigForm.tsx`
4. Check server actions: `app/actions/control-sequences.ts`
