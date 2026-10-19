-- Migration: 20261019150800_add_uuid_to_certificados.sql
-- Description: Add uuid column to public.certificados with default gen_random_uuid() and unique index for secure anti-enumeration verification

-- 1. Add uuid column to public.certificados with default gen_random_uuid()
ALTER TABLE public.certificados
ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid() NOT NULL;

-- 2. Create unique index on uuid for fast lookups and constraint enforcement
CREATE UNIQUE INDEX IF NOT EXISTS idx_certificados_uuid ON public.certificados (uuid);

-- 3. Document purpose
COMMENT ON COLUMN public.certificados.uuid IS 'Public identifier / UUID for secure QR verification and anti-enumeration';

-- 4. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
