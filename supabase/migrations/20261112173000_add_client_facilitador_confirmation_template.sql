-- 20261112173000_add_client_facilitador_confirmation_template.sql
-- Default template for Facilitator Confirmation sent to the client contact person in the OSI.
-- Includes course details, dates, hours, and attaches the facilitator's Ficha Técnica PDF.

INSERT INTO public.capacitacion_email_templates
  (name, slug, event_type, subject, body, is_default, is_active)
VALUES (
  'Confirmación de Facilitador al Cliente',
  'confirmacion-facilitador-cliente',
  'confirmacion_facilitador_cliente',
  'Confirmación de Facilitador: {{facilitador_nombre}} — {{curso}} (OSI {{nro_osi}})',
  $BODY$Estimado/a {{contacto}},

Es un placer saludarle en nombre de SHA de Venezuela.

Le informamos que ha sido confirmado y asignado el facilitador para el desarrollo del servicio de capacitación contratado por {{empresa}}:

DATOS DEL SERVICIO:
• Curso / Servicio: {{curso}}
• N° OSI: {{nro_osi}}
• Fecha(s): {{fechas}}
• Horario: {{horario}}
• Duración: {{duracion}} horas
• Ubicación / Dirección: {{direccion}}

FACILITADOR ASIGNADO:
• Facilitador: {{facilitador_nombre}}

📎 Se adjunta la Ficha Técnica oficial del facilitador con su síntesis curricular, perfil profesional y competencias técnicas.

Quedamos a su entera disposición para cualquier consulta o coordinación previa a la actividad.

Atentamente,
Coordinación de Capacitación
SHA de Venezuela, C.A.
capacitacion@shadevenezuela.com.ve$BODY$,
  true,
  true
)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  updated_at = now();
