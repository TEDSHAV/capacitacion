-- Reopen OSI 3536 (id_osi = 320) so facilitador Marcos De Leones can complete remaining sessions (e.g. Session 4).
-- Note: Sessions 1 and 2 were already executed and remain intact. Do NOT touch their execution dates or steps.

-- 1. Revert participant records to draft status so the service is open for final submission once Session 4 is executed
UPDATE ejecucion_osi_participantes
SET status = 'draft'
WHERE osi_id = 320 AND status = 'final';

-- 2. Clear any premature acknowledgment audit record
DELETE FROM facilitador_acknowledgments
WHERE osi_id = 320;

-- 3. Clean up any premature auto-marked attachment steps on Session 4
-- ONLY if no actual uploaded file exists in ejecucion_osi_asistencia for Session 4
DELETE FROM capacitacion_proceso_steps
WHERE osi_id = 320
  AND nro_sesion = 4
  AND step_key IN ('lista_asistencia', 'calificacion', 'material_fotografico')
  AND completed_by IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM ejecucion_osi_asistencia a
    WHERE a.osi_id = 320
      AND (a.nro_sesion = 4)
      AND (
        (capacitacion_proceso_steps.step_key = 'lista_asistencia' AND a.category = 'lista_asistencia') OR
        (capacitacion_proceso_steps.step_key = 'calificacion' AND a.category = 'hoja_calificacion') OR
        (capacitacion_proceso_steps.step_key = 'material_fotografico' AND a.category = 'material_fotografico')
      )
  );
