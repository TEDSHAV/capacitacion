# Migration Notes - Legacy System to New Control Sequence System

## Overview
If you're migrating from a legacy certificate system and want to continue the control number sequence from where it left off, this guide explains how the new system handles this.

## Scenario: Migrating from Legacy System

### Your Legacy System Had:
- Last certificate with: Libro 378, Hoja 1, Linea 1, Nro. Ctrl 281201755304

### What You Need to Do:

#### Step 1: Set Up Supabase (Done by Developer)
The developer has already created:
- `control_sequences` table
- Updated `get_next_control_numbers()` RPC function
- Admin configuration page

#### Step 2: Configure Initial Sequence (You - Admin)
1. Navigate to: `/dashboard/capacitacion/configuracion/secuencias-control`
2. The form will be pre-filled with:
   - Libro: 378
   - Hoja: 1
   - Línea: 1
   - Nro. Control: 281201755304
3. Click "Guardar Configuración"

#### Step 3: Generate First Certificate
1. Go to certificate generation
2. Fill in certificate details
3. Generate the certificate
4. The system will automatically use your configured starting values

#### Step 4: Verify Sequence Continuation
1. Check the first generated certificate
2. It should have: Libro 378, Hoja 1, Linea 1, Nro. Ctrl 281201755304
3. Generate another certificate
4. It should have: Libro 378, Hoja 1, Linea 2, Nro. Ctrl 281201755305
5. Sequence continues automatically from there

## How the System Works

### Before Any Certificates Exist
```
Configuration Page
    ↓
Admin sets: Libro 378, Hoja 1, Linea 1, Nro. Ctrl 281201755304
    ↓
Stored in control_sequences table with is_active = true
    ↓
Ready for first certificate
```

### When First Certificate is Generated
```
Certificate Generation
    ↓
Check control_sequences table
    ↓
Find active configuration
    ↓
Check if any certificates exist (NO)
    ↓
Use configured values as starting point
    ↓
First certificate: Libro 378, Hoja 1, Linea 1, Nro. Ctrl 281201755304
```

### When Subsequent Certificates are Generated
```
Certificate Generation
    ↓
Check control_sequences table
    ↓
Find active configuration
    ↓
Check if any certificates exist (YES)
    ↓
Use RPC to calculate next numbers from last certificate
    ↓
Next certificate: Libro 378, Hoja 1, Linea 2, Nro. Ctrl 281201755305
    ↓
And so on...
```

## Wrapping Logic

The system automatically handles wrapping:

### Line Wrapping (10 lines per sheet)
```
Linea 1  → Linea 2  → ... → Linea 10 → Linea 1 (next sheet)
                                       ↑
                                   Hoja increments
```

### Sheet Wrapping (100 sheets per book)
```
Hoja 1 → Hoja 2 → ... → Hoja 100 → Hoja 1 (next book)
                                    ↑
                                Libro increments
```

### Control Number (Independent)
```
Nro. Ctrl 281201755304 → 281201755305 → 281201755306 → ...
                         (always increments by 1)
```

## Example Sequence

Starting from: Libro 378, Hoja 1, Linea 1, Nro. Ctrl 281201755304

| Certificate | Libro | Hoja | Linea | Nro. Ctrl |
|-------------|-------|------|-------|-----------|
| 1           | 378   | 1    | 1     | 281201755304 |
| 2           | 378   | 1    | 2     | 281201755305 |
| 3           | 378   | 1    | 3     | 281201755306 |
| ...         | ...   | ...  | ...   | ... |
| 10          | 378   | 1    | 10    | 281201755313 |
| 11          | 378   | 2    | 1     | 281201755314 |
| 12          | 378   | 2    | 2     | 281201755315 |
| ...         | ...   | ...  | ...   | ... |
| 1010        | 378   | 101  | 1     | 281201756313 |
| 1011        | 379   | 1    | 1     | 281201756314 |

## Important Notes

### ✅ Configuration is One-Time
- Once you set the initial sequence, it cannot be changed
- This prevents accidental conflicts
- The configuration page becomes read-only after the first certificate

### ✅ Automatic Continuation
- After initial setup, the system automatically calculates next numbers
- No manual intervention needed
- Sequence continues seamlessly across all future certificates

### ✅ Backward Compatibility
- If you don't configure initial values, the system defaults to: Libro 1, Hoja 1, Linea 1, Nro. Ctrl 1
- This is useful if you're starting fresh without legacy data

### ✅ Audit Trail
- All configuration changes are logged with timestamps
- You can see the history of configurations in the admin panel
- Useful for compliance and debugging

## Troubleshooting Migration

### Issue: "Cannot set control sequence after certificates have been generated"
**Cause**: You already have certificates in the system
**Solution**: 
- If these are test certificates, you can delete them from Supabase
- If they're real certificates, you need to adjust your configuration to match the last certificate's numbers

### Issue: First certificate doesn't have the configured numbers
**Cause**: Configuration wasn't saved or RPC function not updated
**Solution**:
1. Check admin panel: `/dashboard/capacitacion/configuracion/secuencias-control`
2. Verify "Configuración Activa" section shows your values
3. Check Supabase: `SELECT * FROM control_sequences WHERE is_active = true;`
4. Verify RPC function is updated

### Issue: Sequence jumps or skips numbers
**Cause**: Multiple certificates generated simultaneously (race condition)
**Solution**:
- The RPC function uses atomic operations to prevent this
- If it still happens, check that the RPC function is correctly implemented
- Review `SUPABASE_SETUP_INSTRUCTIONS.md` for the correct RPC code

## Data Integrity

### What Happens to Old Legacy Data?
- The new system doesn't touch existing data
- It only manages new certificates going forward
- If you have old certificates in the system, they keep their original numbers

### Starting Fresh
- If you want to start completely fresh (no legacy data):
  1. Don't configure initial values
  2. System will default to: Libro 1, Hoja 1, Linea 1, Nro. Ctrl 1
  3. First certificate will use these defaults

### Continuing from Legacy
- If you want to continue from legacy system:
  1. Configure with the last legacy certificate's numbers
  2. First new certificate will use these values
  3. Subsequent certificates increment from there

## Support

If you encounter any issues during migration:

1. **Check the logs**: Application logs will show any errors
2. **Verify Supabase setup**: Run the test queries in `SUPABASE_SETUP_INSTRUCTIONS.md`
3. **Review the configuration**: Check admin panel for active configuration
4. **Test the RPC**: Run `SELECT * FROM get_next_control_numbers(1);` in Supabase
5. **Check database**: Verify certificados table has the correct numbers

## Summary

The new control sequence system makes it easy to:
✅ Migrate from legacy systems
✅ Continue numbering from where you left off
✅ Automatically manage sequence increments
✅ Handle wrapping (lines → sheets → books)
✅ Maintain audit trails
✅ Prevent configuration conflicts

No manual number management needed after initial setup!
