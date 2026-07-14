# Control Number Sequence Initialization - Implementation Summary

## Overview
Implementation of an admin configuration system to initialize certificate control number sequences from legacy system values (Libro 378, Hoja 1, Linea 1, Nro. Ctrl 281201755304).

## What Was Implemented

### 1. Type Definitions (`types/index.ts`)
- **ControlSequenceConfig**: Interface for stored control sequence configurations
  - Includes: nro_libro, nro_hoja, nro_linea, nro_control, is_active, timestamps, created_by, notes
- **ControlSequenceFormData**: Interface for form input

### 2. Server Actions (`app/actions/control-sequences.ts`)
Provides server-side operations:
- `getActiveControlSequence()`: Fetch the currently active configuration
- `getAllControlSequences()`: Get full history of configurations
- `hasCertificatesBeenGenerated()`: Check if any certificates exist (blocks configuration changes)
- `createControlSequence()`: Create new configuration (only if no certificates exist)
- `deactivateControlSequence()`: Deactivate current configuration

**Key Features:**
- Validation of input values (Libro >= 1, Hoja 1-100, Linea 1-10, Nro. Ctrl >= 1)
- Prevents configuration changes after certificates are generated
- Automatic deactivation of previous configurations
- Audit trail with created_by and timestamps

### 3. Admin UI Pages

#### Configuration Hub (`app/dashboard/capacitacion/configuracion/page.tsx`)
- Main settings page listing all configuration options
- Currently has one section: "Secuencias de Control"
- Extensible for future admin settings

#### Sequence Configuration Page (`app/dashboard/capacitacion/configuracion/secuencias-control/page.tsx`)
- Displays current active configuration
- Shows configuration history
- Status indicators:
  - Blue banner: Configuration required
  - Green banner: Configuration active
  - Amber banner: Configuration locked (certificates exist)
- Responsive layout with configuration form and current values side-by-side

#### Configuration Form Component (`app/dashboard/capacitacion/configuracion/secuencias-control/components/SequenceConfigForm.tsx`)
- Form inputs for all four control numbers
- Pre-filled with legacy system values as defaults
- Validation feedback
- Success/error messages
- Disabled state when certificates exist
- Optional notes field for audit purposes

### 4. Certificate Generation Integration (`app/actions/certificados.ts`)
Updated `saveCertificatesToDatabase()` function:
- Checks for active control_sequences configuration first
- If no certificates exist, uses configured starting values
- If certificates exist, uses RPC to get next numbers from last certificate
- Falls back to RPC if no configuration exists
- Maintains backward compatibility

### 5. Utility Functions (`lib/control-sequences-utils.ts`)
Helper functions for control number operations:
- `validateControlNumbers()`: Validate input values
- `formatControlNumbers()`: Format for display
- `calculateNextControlNumbers()`: Calculate next sequence with wrapping logic
- `getControlNumbersDescription()`: Human-readable descriptions
- `isNewBook()`, `isNewSheet()`: Check sequence boundaries
- `getNextControlNumber()`: Increment control number

## Supabase Setup Required

### Database Table
Create `control_sequences` table with:
- UUID primary key
- nro_libro, nro_hoja, nro_linea, nro_control (all with CHECK constraints)
- is_active boolean (only one can be true)
- created_by, notes (optional fields)
- created_at, updated_at timestamps
- Index on is_active for fast lookups

### RPC Function
Update or create `get_next_control_numbers()` RPC function that:
1. Checks control_sequences table for active configuration
2. Returns configured values if no certificates exist
3. Calculates next numbers from last certificate if certificates exist
4. Handles wrapping logic (10 lines/sheet, 100 sheets/book)

### Row Level Security
Enable RLS on control_sequences table with policies allowing:
- Authenticated users to read
- Admins to write (can be restricted further based on your auth setup)

**See `SUPABASE_SETUP_INSTRUCTIONS.md` for complete SQL scripts**

## File Structure

```
app/
├── actions/
│   ├── certificados.ts (MODIFIED)
│   └── control-sequences.ts (NEW)
├── dashboard/
│   └── capacitacion/
│       └── configuracion/
│           ├── page.tsx (NEW)
│           └── secuencias-control/
│               ├── page.tsx (NEW)
│               └── components/
│                   └── SequenceConfigForm.tsx (NEW)
lib/
└── control-sequences-utils.ts (NEW)
types/
└── index.ts (MODIFIED)
```

## How It Works

### Initial Setup (No Certificates Yet)
1. Admin navigates to `/dashboard/capacitacion/configuracion/secuencias-control`
2. Sees form with pre-filled legacy system values
3. Can modify values if needed
4. Clicks "Guardar Configuración"
5. Configuration is stored in control_sequences table with is_active = true

### Certificate Generation (After Configuration)
1. User generates certificates
2. `saveCertificatesToDatabase()` checks for active control_sequences config
3. Since no certificates exist yet, uses configured values as starting point
4. First certificate gets: Libro 378, Hoja 1, Linea 1, Nro. Ctrl 281201755304
5. Second certificate gets: Libro 378, Hoja 1, Linea 2, Nro. Ctrl 281201755305
6. And so on, with automatic wrapping

### After Certificates Exist
1. Configuration page shows "Certificados ya generados" banner
2. Form is disabled (read-only)
3. Configuration history is still visible
4. New certificates use RPC to calculate next numbers from last certificate
5. Sequence continues seamlessly

## Testing Checklist

- [ ] Supabase table created and RLS enabled
- [ ] RPC function updated/created
- [ ] Navigate to `/dashboard/capacitacion/configuracion`
- [ ] Click on "Secuencias de Control"
- [ ] See form with default values (378, 1, 1, 281201755304)
- [ ] Submit form successfully
- [ ] See "Configuración Activa" section with values
- [ ] Generate a test certificate
- [ ] Verify first certificate has Libro 378, Hoja 1, Linea 1, Nro. Ctrl 281201755304
- [ ] Generate another certificate
- [ ] Verify second certificate has incremented values
- [ ] Refresh configuration page
- [ ] Verify form is now disabled (certificates exist)
- [ ] Check history table shows configuration entry

## Key Design Decisions

1. **One-time Configuration**: Once certificates are generated, the configuration becomes read-only. This prevents accidental changes that could cause sequence conflicts.

2. **Backward Compatibility**: If no control_sequences configuration exists, the system falls back to the existing RPC logic, ensuring no breaking changes.

3. **Audit Trail**: All configurations are stored with timestamps and creator info for compliance and debugging.

4. **Validation**: Input validation happens both on the client (form) and server (action) for security.

5. **Atomic Operations**: The RPC function ensures no race conditions when multiple users generate certificates simultaneously.

## Future Enhancements

- Per-company control sequences (different sequences for different clients)
- Per-OSI control sequences (different sequences for different service orders)
- Admin dashboard with metrics on control number usage
- Export/import of control sequence configurations
- Notification when approaching book/sheet boundaries

## Support & Troubleshooting

### Configuration not saving
- Check that control_sequences table exists in Supabase
- Verify RLS policies allow authenticated users to insert
- Check browser console for error messages

### Certificates not using configured values
- Verify control_sequences table has an active (is_active = true) record
- Check that certificados table is empty (no previous certificates)
- Review application logs for any RPC errors

### Control numbers not incrementing correctly
- Verify RPC function logic matches wrapping rules (10 lines/sheet, 100 sheets/book)
- Check that nro_control increments independently from other fields
- Review database trigger (if any) that might be interfering

## Files Modified/Created Summary

| File | Type | Purpose |
|------|------|---------|
| types/index.ts | Modified | Added ControlSequenceConfig and ControlSequenceFormData interfaces |
| app/actions/control-sequences.ts | Created | Server actions for control sequence management |
| app/actions/certificados.ts | Modified | Integrated control_sequences config into certificate generation |
| app/dashboard/capacitacion/configuracion/page.tsx | Created | Admin settings hub |
| app/dashboard/capacitacion/configuracion/secuencias-control/page.tsx | Created | Main configuration page |
| app/dashboard/capacitacion/configuracion/secuencias-control/components/SequenceConfigForm.tsx | Created | Configuration form component |
| lib/control-sequences-utils.ts | Created | Utility functions for control number operations |
| SUPABASE_SETUP_INSTRUCTIONS.md | Created | SQL scripts and setup guide |
| IMPLEMENTATION_SUMMARY.md | Created | This file |
