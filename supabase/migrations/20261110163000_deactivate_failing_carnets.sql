-- Migration: Deactivate carnets for certificates with failing score (< 14)
-- Ensures participants who did not approve do not retain active carnets in database

UPDATE public.carnets c
SET is_active = false
FROM public.certificados cert
WHERE c.id_certificado = cert.id
  AND c.is_active = true
  AND (cert.calificacion < 14 OR cert.calificacion IS NULL);

